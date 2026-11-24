import "server-only";

import dns from "node:dns/promises";
import net from "node:net";
import * as cheerio from "cheerio";
import { ok, err, type Result } from "@/lib/result";
import { AppError } from "@/lib/errors";
import { mapJobObjectToFields } from "./json-parser";
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

export function isPrivateOrReservedIp(ip: string): boolean {
  const normalized = ip.trim().toLowerCase().replace(/^\[|\]$/g, "");
  const ipType = net.isIP(normalized);
  if (ipType === 4) {
    return isPrivateIpv4(normalized);
  }
  if (ipType === 6) {
    if (normalized === "::" || normalized === "::1") return true;
    if (normalized.startsWith("::ffff:")) {
      const mapped = normalized.slice("::ffff:".length);
      if (net.isIP(mapped) === 4) return isPrivateIpv4(mapped);
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

async function assertHostResolvesPublicly(hostname: string): Promise<Result<void, AppError>> {
  const cleanHost = hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(cleanHost) !== 0) {
    return isPrivateOrReservedIp(cleanHost)
      ? err(new AppError("VALIDATION_ERROR", "Private network IP URLs cannot be fetched."))
      : ok(undefined);
  }

  try {
    const records = await dns.lookup(cleanHost, { all: true });
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
    return ok(undefined);
  } catch {
    return err(
      new AppError("EXTERNAL_API_ERROR", "Could not resolve job URL domain.")
    );
  }
}

function findJobPostingInJsonLd(node: unknown): Record<string, unknown> | null {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findJobPostingInJsonLd(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof node === "object") {
    const rec = node as Record<string, unknown>;
    const rawType = rec["@type"];
    const types = Array.isArray(rawType) ? rawType : [rawType];
    if (
      types.some(
        (t) => typeof t === "string" && t.toLowerCase().includes("jobposting")
      )
    ) {
      return rec;
    }
    if (rec["@graph"]) {
      const graphFound = findJobPostingInJsonLd(rec["@graph"]);
      if (graphFound) return graphFound;
    }
  }
  return null;
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
  try {
    const parsed = new URL(finalUrl);
    if (/\/(authwall|uas\/login|checkpoint|login)(\/|$)/i.test(parsed.pathname)) {
      return true;
    }
  } catch {
    // Ignore URL parse error here
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

  const mainContainer = $("main, article, [role='main']").first();
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

async function readResponseWithLimit(
  response: Response,
  maxBytes: number
): Promise<Result<string, AppError>> {
  const contentLengthHeader = response.headers.get("content-length");
  if (contentLengthHeader) {
    const len = Number(contentLengthHeader);
    if (!Number.isNaN(len) && len > maxBytes) {
      return err(
        new AppError("EXTERNAL_API_ERROR", "Target job page is too large to import.")
      );
    }
  }

  if (!response.body) {
    const text = await response.text();
    return ok(text.slice(0, maxBytes));
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        break;
      }
      chunks.push(value);
    }
  }

  const merged = Buffer.concat(chunks.map((c) => Buffer.from(c)));
  return ok(merged.toString("utf-8"));
}

/**
 * Fetches an external job URL safely (SSRF-guarded) and extracts structured JobPosting data
 * or cleaned HTML text for AI parsing.
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

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const dnsCheck = await assertHostResolvesPublicly(currentUrl.hostname);
      if (!dnsCheck.ok) return err(dnsCheck.error);

      const response = await fetch(currentUrl.toString(), {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; JobpilotImporter/1.0; +https://jobpilot.app)",
          Accept:
            "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location || hop === MAX_REDIRECTS) {
          return err(
            new AppError(
              "EXTERNAL_API_ERROR",
              "Too many redirects when fetching job URL."
            )
          );
        }
        const nextUrlResult = validateExternalJobUrl(
          new URL(location, currentUrl).toString()
        );
        if (!nextUrlResult.ok) return err(nextUrlResult.error);
        currentUrl = nextUrlResult.value;
        continue;
      }

      if (!response.ok) {
        return err(
          new AppError(
            "EXTERNAL_API_ERROR",
            `This site blocked or failed the request (HTTP ${response.status}). Copy-paste the job text or upload a PDF instead.`
          )
        );
      }

      const contentType = (response.headers.get("content-type") || "").toLowerCase();
      if (
        contentType &&
        !contentType.includes("text/html") &&
        !contentType.includes("application/xhtml+xml") &&
        !contentType.includes("application/json") &&
        !contentType.includes("text/plain")
      ) {
        return err(
          new AppError(
            "EXTERNAL_API_ERROR",
            "The URL did not return a readable job webpage."
          )
        );
      }

      const bodyRes = await readResponseWithLimit(response, MAX_RESPONSE_BYTES);
      if (!bodyRes.ok) return err(bodyRes.error);

      const finalUrl = currentUrl.toString();

      if (contentType.includes("application/json")) {
        try {
          const parsed: unknown = JSON.parse(bodyRes.value);
          if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
            const mapped = mapJobObjectToFields(parsed as Record<string, unknown>);
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
          plainText: bodyRes.value.slice(0, MAX_PLAIN_TEXT_CHARS),
          finalUrl,
        });
      }

      const extracted = extractJobFromHtml(bodyRes.value, finalUrl);
      if (
        !extracted.structured &&
        (extracted.plainText.trim().length < 40 ||
          detectBlockedOrAuthWallPage(
            finalUrl,
            bodyRes.value,
            extracted.plainText
          ))
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
