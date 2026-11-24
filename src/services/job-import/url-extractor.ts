import "server-only";

import type { LookupAddress } from "node:dns";
import dns from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import * as cheerio from "cheerio";
import { ok, err, type Result } from "@/lib/result";
import { AppError } from "@/lib/errors";
import { findJobPostingInJsonLd, mapJobObjectToFields } from "./json-parser";
import type { ExtractedJobFields } from "./schema";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024; // 2MB
const MAX_PLAIN_TEXT_CHARS = 15_000;
const MAX_REDIRECTS = 3;

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "0.0.0.0",
  "127.0.0.1",
  "::1",
  "metadata.google.internal",
]);

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local / cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast / reserved
  return false;
}

function parseIpv4MappedIpv6(normalizedIpv6: string): string | null {
  const parts = normalizedIpv6.split("::ffff:");
  if (parts.length !== 2) {
    // Also handle expanded form 0:0:0:0:0:ffff:...
    const match = normalizedIpv6.match(
      /^(?:0{1,4}:){5}ffff:([0-9a-f.:]+)$/i
    );
    if (!match) return null;
    const tail = match[1];
    if (net.isIP(tail) === 4) return tail;
    const hexMatch = tail.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
    if (!hexMatch) return null;
    const hi = parseInt(hexMatch[1], 16);
    const lo = parseInt(hexMatch[2], 16);
    return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
  }

  const [prefix, tail] = parts;
  if (prefix !== "" && !/^(?:0{1,4}:)*0{1,4}$/.test(prefix)) {
    return null;
  }
  if (net.isIP(tail) === 4) return tail;

  const hexMatch = tail.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (!hexMatch) return null;
  const hi = parseInt(hexMatch[1], 16);
  const lo = parseInt(hexMatch[2], 16);
  return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
}

export function isPrivateOrReservedIp(ip: string): boolean {
  const normalized = ip.trim().toLowerCase().replace(/^\[|\]$/g, "");
  const ipType = net.isIP(normalized);
  if (ipType === 4) {
    return isPrivateIpv4(normalized);
  }
  if (ipType === 6) {
    if (normalized === "::" || normalized === "::1") return true;
    const mappedIpv4 = parseIpv4MappedIpv6(normalized);
    if (mappedIpv4) {
      return isPrivateIpv4(mappedIpv4);
    }
    if (/^(fc|fd)[0-9a-f]{2}:/i.test(normalized)) return true; // ULA fc00::/7
    if (/^fe[89ab][0-9a-f]:/i.test(normalized)) return true; // link-local fe80::/10
    return false;
  }
  return true;
}

/**
 * Validates that a user-provided job URL is safe HTTP(S) and not targeting internal hosts.
 */
export function validateExternalJobUrl(rawUrl: string): Result<URL, AppError> {
  const trimmed = rawUrl.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return err(new AppError("VALIDATION_ERROR", "Invalid job URL format."));
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return err(
      new AppError(
        "VALIDATION_ERROR",
        "Only http:// and https:// job URLs are supported."
      )
    );
  }

  if (parsed.username || parsed.password) {
    return err(
      new AppError("VALIDATION_ERROR", "URLs with embedded credentials are not allowed.")
    );
  }

  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    !host ||
    BLOCKED_HOSTNAMES.has(host) ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".localhost")
  ) {
    return err(
      new AppError("VALIDATION_ERROR", "Local or internal URLs cannot be fetched.")
    );
  }

  if (net.isIP(host) !== 0 && isPrivateOrReservedIp(host)) {
    return err(
      new AppError("VALIDATION_ERROR", "Private network IP URLs cannot be fetched.")
    );
  }

  return ok(parsed);
}

function createTimeoutError(): Error {
  const errObj = new Error("Timed out fetching job URL.");
  errObj.name = "TimeoutError";
  return errObj;
}

function getRemainingMs(deadline: number): number {
  const remaining = deadline - Date.now();
  if (remaining <= 0) {
    throw createTimeoutError();
  }
  return remaining;
}

interface PinnedAddress {
  address: string;
  family: 4 | 6;
}

async function assertHostResolvesPublicly(
  hostname: string,
  remainingMs: number
): Promise<Result<PinnedAddress, AppError>> {
  const cleanHost = hostname.replace(/^\[|\]$/g, "");
  const ipVer = net.isIP(cleanHost);
  if (ipVer !== 0) {
    return isPrivateOrReservedIp(cleanHost)
      ? err(new AppError("VALIDATION_ERROR", "Private network IP URLs cannot be fetched."))
      : ok({ address: cleanHost, family: ipVer === 6 ? 6 : 4 });
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const records = await Promise.race([
      dns.lookup(cleanHost, { all: true }),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(createTimeoutError()), remainingMs);
      }),
    ]);
    if (records.length === 0) {
      return err(new AppError("EXTERNAL_API_ERROR", "Could not resolve job URL host."));
    }
    for (const record of records) {
      if (isPrivateOrReservedIp(record.address)) {
        return err(
          new AppError(
            "VALIDATION_ERROR",
            "Target URL resolves to a private network address."
          )
        );
      }
    }
    const primary = records[0];
    return ok({
      address: primary.address,
      family: primary.family === 6 ? 6 : 4,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw error;
    }
    return err(
      new AppError("EXTERNAL_API_ERROR", "Could not resolve job URL domain.")
    );
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

/** Returns true when the URL path matches common login or bot-verification gates. */
export function isBlockedAuthWallPath(finalUrl: string): boolean {
  try {
    const parsed = new URL(finalUrl);
    return /\/(authwall|uas\/login|checkpoint|login)(\/|$)/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

const BLOCKED_TITLE_PATTERNS = [
  "sign in",
  "log in",
  "se connecter",
  "connexion",
  "just a moment",
  "attention required",
  "access denied",
  "security verification",
  "captcha",
  "verify you are human",
];

/**
 * Detects login walls (e.g., LinkedIn /authwall), CAPTCHAs, and bot-block challenge pages
 * so the importer fails cleanly at 0 credits instead of sending junk to AI.
 */
export function detectBlockedOrAuthWallPage(
  finalUrl: string,
  html: string,
  plainText: string
): boolean {
  if (isBlockedAuthWallPath(finalUrl)) {
    return true;
  }

  const $ = cheerio.load(html);
  const title = $("title").first().text().trim().toLowerCase();
  if (BLOCKED_TITLE_PATTERNS.some((pattern) => title.includes(pattern))) {
    return true;
  }

  const normalizedText = plainText.trim().toLowerCase();
  if (
    normalizedText.length < 600 &&
    /(sign in to view|join now|security check|enable javascript and cookies|checking if the site connection is secure)/.test(
      normalizedText
    )
  ) {
    return true;
  }

  return false;
}

/**
 * Extracts structured `schema.org/JobPosting` JSON-LD if present, or falls back
 * to cleaned plain text suitable for AI extraction.
 */
export function extractJobFromHtml(
  html: string,
  sourceUrl: string
): { structured: ExtractedJobFields | null; plainText: string } {
  const $ = cheerio.load(html);

  const ldScripts = $('script[type="application/ld+json"]');
  for (let i = 0; i < ldScripts.length; i++) {
    const rawJson = $(ldScripts[i]).contents().text().trim();
    if (!rawJson) continue;
    try {
      const parsed: unknown = JSON.parse(rawJson);
      const jobPosting = findJobPostingInJsonLd(parsed);
      if (jobPosting) {
        const mapped = mapJobObjectToFields(jobPosting);
        if (mapped.title || mapped.description) {
          return {
            structured: {
              ...mapped,
              url: mapped.url || sourceUrl,
            },
            plainText: "",
          };
        }
      }
    } catch {
      // Ignore malformed JSON-LD script blocks.
    }
  }

  const pageTitle = $("title").first().text().trim();
  const ogTitle = $('meta[property="og:title"]').attr("content")?.trim() || "";
  const ogSite = $('meta[property="og:site_name"]').attr("content")?.trim() || "";
  const metaDesc = $('meta[name="description"]').attr("content")?.trim() || "";

  $("script, style, noscript, svg, nav, footer, header, iframe, form").remove();

  const primaryMain = $("main, [role='main']").first();
  const mainContainer = primaryMain.length ? primaryMain : $("article").first();
  const rawBody = (mainContainer.length ? mainContainer : $("body")).text();
  const cleanedBody = rawBody
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();

  const headerLines = [
    pageTitle ? `Page Title: ${pageTitle}` : "",
    ogTitle && ogTitle !== pageTitle ? `OG Title: ${ogTitle}` : "",
    ogSite ? `Site: ${ogSite}` : "",
    metaDesc ? `Meta Description: ${metaDesc}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const combined = [headerLines, cleanedBody].filter(Boolean).join("\n\n");
  return {
    structured: null,
    plainText: combined.slice(0, MAX_PLAIN_TEXT_CHARS),
  };
}

type PinnedResponsePayload =
  | { kind: "redirect"; location: string }
  | { kind: "body"; contentType: string; text: string };

function createPinnedLookup(pinned: PinnedAddress): net.LookupFunction {
  return (_hostname, options, callback) => {
    if (typeof options === "object" && options?.all) {
      const multiCb = callback as (
        err: NodeJS.ErrnoException | null,
        addresses: LookupAddress[]
      ) => void;
      multiCb(null, [{ address: pinned.address, family: pinned.family }]);
      return;
    }
    callback(null, pinned.address, pinned.family);
  };
}

function requestPinnedUrl(
  targetUrl: URL,
  pinned: PinnedAddress,
  maxBytes: number,
  deadline: number
): Promise<Result<PinnedResponsePayload, AppError>> {
  const remainingMs = getRemainingMs(deadline);

  return new Promise((resolve, reject) => {
    let settled = false;
    const isHttps = targetUrl.protocol === "https:";
    const pinnedLookup = createPinnedLookup(pinned);
    const timeout: { id: ReturnType<typeof setTimeout> | undefined } = {
      id: undefined,
    };

    const settleOk = (res: Result<PinnedResponsePayload, AppError>) => {
      if (settled) return;
      settled = true;
      if (timeout.id !== undefined) clearTimeout(timeout.id);
      resolve(res);
    };

    const settleErr = (error: unknown) => {
      if (settled) return;
      settled = true;
      if (timeout.id !== undefined) clearTimeout(timeout.id);
      reject(error);
    };

    const baseOptions: http.RequestOptions = {
      protocol: targetUrl.protocol,
      hostname: targetUrl.hostname,
      port: targetUrl.port ? Number(targetUrl.port) : undefined,
      path: `${targetUrl.pathname}${targetUrl.search}`,
      method: "GET",
      lookup: pinnedLookup,
      headers: {
        Host: targetUrl.host,
        "User-Agent":
          "Mozilla/5.0 (compatible; JobpilotImporter/1.0; +https://jobpilot.app)",
        Accept:
          "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
      },
    };

    const handleResponse = (res: http.IncomingMessage) => {
      const status = res.statusCode ?? 0;

      if (status >= 300 && status < 400) {
        const rawLocation = res.headers.location;
        const location = Array.isArray(rawLocation)
          ? rawLocation[0] || ""
          : rawLocation || "";
        res.destroy();
        settleOk(ok({ kind: "redirect", location }));
        return;
      }

      if (status < 200 || status >= 300) {
        res.destroy();
        settleOk(
          err(
            new AppError(
              "EXTERNAL_API_ERROR",
              `This site blocked or failed the request (HTTP ${status}). Copy-paste the job text or upload a PDF instead.`
            )
          )
        );
        return;
      }

      const contentType = (res.headers["content-type"] || "").toLowerCase();
      if (
        contentType &&
        !contentType.includes("text/html") &&
        !contentType.includes("application/xhtml+xml") &&
        !contentType.includes("application/json") &&
        !contentType.includes("text/plain")
      ) {
        res.destroy();
        settleOk(
          err(
            new AppError(
              "EXTERNAL_API_ERROR",
              "The URL did not return a readable job webpage."
            )
          )
        );
        return;
      }

      const contentLength = res.headers["content-length"];
      if (contentLength) {
        const len = Number(contentLength);
        if (!Number.isNaN(len) && len > maxBytes) {
          res.destroy();
          settleOk(
            err(
              new AppError(
                "EXTERNAL_API_ERROR",
                "Target job page is too large to import."
              )
            )
          );
          return;
        }
      }

      const chunks: Buffer[] = [];
      let total = 0;

      res.on("data", (chunk: Buffer | string) => {
        if (settled) return;
        const buf = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
        total += buf.byteLength;
        if (total > maxBytes) {
          res.destroy();
          settleOk(
            err(
              new AppError(
                "EXTERNAL_API_ERROR",
                "Target job page is too large to import."
              )
            )
          );
          return;
        }
        chunks.push(buf);
      });

      res.on("end", () => {
        settleOk(
          ok({
            kind: "body",
            contentType,
            text: Buffer.concat(chunks).toString("utf-8"),
          })
        );
      });

      res.on("error", (errObj) => {
        if (!settled) {
          settleErr(errObj);
        }
      });
    };

    const req = isHttps
      ? https.request(
          { ...baseOptions, servername: targetUrl.hostname },
          handleResponse
        )
      : http.request(baseOptions, handleResponse);

    timeout.id = setTimeout(() => {
      const timeoutErr = createTimeoutError();
      if (!settled) {
        settled = true;
        req.destroy(timeoutErr);
        reject(timeoutErr);
      }
    }, remainingMs);

    req.on("error", (errObj) => {
      settleErr(errObj);
    });

    req.end();
  });
}

/**
 * Fetches an external job URL safely (SSRF-guarded with connection-time IP pinning)
 * and extracts structured JobPosting data or cleaned HTML text for AI parsing.
 */
export async function fetchAndExtractJobUrl(
  rawUrl: string
): Promise<
  Result<
    { structured: ExtractedJobFields | null; plainText: string; finalUrl: string },
    AppError
  >
> {
  const initialValidation = validateExternalJobUrl(rawUrl);
  if (!initialValidation.ok) return err(initialValidation.error);

  let currentUrl = initialValidation.value;
  const deadline = Date.now() + FETCH_TIMEOUT_MS;

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const dnsCheck = await assertHostResolvesPublicly(
        currentUrl.hostname,
        getRemainingMs(deadline)
      );
      if (!dnsCheck.ok) return err(dnsCheck.error);

      const responseRes = await requestPinnedUrl(
        currentUrl,
        dnsCheck.value,
        MAX_RESPONSE_BYTES,
        deadline
      );
      if (!responseRes.ok) return err(responseRes.error);

      const responsePayload = responseRes.value;
      if (responsePayload.kind === "redirect") {
        if (!responsePayload.location || hop === MAX_REDIRECTS) {
          return err(
            new AppError(
              "EXTERNAL_API_ERROR",
              "Too many redirects when fetching job URL."
            )
          );
        }
        const nextUrlResult = validateExternalJobUrl(
          new URL(responsePayload.location, currentUrl).toString()
        );
        if (!nextUrlResult.ok) return err(nextUrlResult.error);
        currentUrl = nextUrlResult.value;
        continue;
      }

      const { contentType, text: bodyText } = responsePayload;
      const finalUrl = currentUrl.toString();

      if (isBlockedAuthWallPath(finalUrl)) {
        return err(
          new AppError(
            "EXTERNAL_API_ERROR",
            "This page requires sign-in or blocked automated access. Copy-paste the job text instead."
          )
        );
      }

      if (contentType.includes("application/json")) {
        try {
          const parsed: unknown = JSON.parse(bodyText);
          const candidate =
            findJobPostingInJsonLd(parsed) ??
            (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
              ? (parsed as Record<string, unknown>)
              : null);
          if (candidate) {
            const mapped = mapJobObjectToFields(candidate);
            if (mapped.title || mapped.description) {
              return ok({
                structured: { ...mapped, url: mapped.url || finalUrl },
                plainText: "",
                finalUrl,
              });
            }
          }
        } catch {
          // Fall through to plain text fallback
        }
        return ok({
          structured: null,
          plainText: bodyText.slice(0, MAX_PLAIN_TEXT_CHARS),
          finalUrl,
        });
      }

      const extracted = extractJobFromHtml(bodyText, finalUrl);
      if (
        !extracted.structured &&
        (extracted.plainText.trim().length < 40 ||
          detectBlockedOrAuthWallPage(finalUrl, bodyText, extracted.plainText))
      ) {
        return err(
          new AppError(
            "EXTERNAL_API_ERROR",
            "This page requires sign-in or blocked automated access. Copy-paste the job text instead."
          )
        );
      }

      return ok({
        ...extracted,
        finalUrl,
      });
    }

    return err(
      new AppError(
        "EXTERNAL_API_ERROR",
        "Could not fetch job page after redirects."
      )
    );
  } catch (error) {
    const isTimeout =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");
    return err(
      new AppError(
        "EXTERNAL_API_ERROR",
        isTimeout
          ? "Request timed out while fetching this URL. Copy-paste the job text instead."
          : "Could not reach this URL. Copy-paste the job text or upload a PDF instead.",
        error
      )
    );
  }
}
