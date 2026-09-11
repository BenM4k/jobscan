import "server-only";
import * as cheerio from "cheerio";
import { BaseJobSourceAdapter } from "./base";
import type { NormalizedJobInput, RawJobItem } from "./types";

const USER_AGENT = "Mozilla/5.0 (compatible; drc-job-crawler/1.0)";
const MAX_PAGES = 2;
const PAGE_DELAY_MS = 250;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function deriveExternalId(url: string): string {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.replace(/\/$/, "");
    const parts = pathname.split("/").filter(Boolean);
    const lastPart = parts[parts.length - 1] || pathname;
    return lastPart.replace(/\.html$/, "");
  } catch {
    return url.replace(/[^a-zA-Z0-9_-]/g, "_");
  }
}

function parseFrenchDate(dateStr?: string): Date {
  if (!dateStr) return new Date();
  const trimmed = dateStr.trim();
  const parts = trimmed.split(".");
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  return new Date();
}

export interface EmploiCdRawPayload {
  html: string;
  url: string;
}

/**
 * Fetch raw HTML cards from emploi.cd without field mapping (I/O only).
 */
export async function fetchRaw(options?: {
  target?: string;
  keyword?: string;
}): Promise<RawJobItem[]> {
  const keyword = options?.target || options?.keyword;
  const encodedKw = keyword?.trim() ? encodeURIComponent(keyword.trim()) : "";
  const rawItems: RawJobItem[] = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    if (page > 0) {
      await delay(PAGE_DELAY_MS);
    }

    let pageUrl = "https://www.emploi.cd/recherche-jobs-congo-rdc";
    const queryParams: string[] = [];
    if (encodedKw) {
      queryParams.push(`motcle=${encodedKw}`);
    }
    if (page > 0) {
      queryParams.push(`page=${page}`);
    }
    if (queryParams.length > 0) {
      pageUrl += `?${queryParams.join("&")}`;
    }

    try {
      const res = await fetch(pageUrl, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error(
            `Cloudflare bot protection or HTTP 403 active on www.emploi.cd (status ${res.status})`
          );
        }
        throw new Error(`emploi.cd returned HTTP status ${res.status}`);
      }

      const html = await res.text();
      const $ = cheerio.load(html);
      const cards = $(".job-description-wrapper");
      if (cards.length === 0) {
        break;
      }

      cards.each((_, el) => {
        const $card = $(el);
        const $titleLink = $card.find("h5 a, .job-title a").first();
        let href = $titleLink.attr("href");
        if (!href) return;

        if (href.startsWith("/")) {
          href = `https://www.emploi.cd${href}`;
        }

        const externalId = deriveExternalId(href);
        const cardHtml = $.html(el);

        rawItems.push({
          externalId,
          payload: {
            html: cardHtml,
            url: href,
          } satisfies EmploiCdRawPayload,
        });
      });
    } catch (err: unknown) {
      if (page === 0) {
        throw err;
      }
      break;
    }
  }

  return rawItems;
}

/**
 * Pure function: strips HTML to plain text and maps emploi.cd payload to NormalizedJobInput (no I/O).
 */
export function normalize(raw: unknown): NormalizedJobInput {
  const payload = raw as EmploiCdRawPayload;
  const $ = cheerio.load(payload.html || "");
  const $titleLink = $("h5 a, .job-title a").first();
  const rawTitle = $titleLink.text().replace(/\s+/g, " ").trim();
  const title = rawTitle || "Offre d'emploi Emploi.cd";

  const company =
    $(".company-name, a.company-link").first().text().trim() ||
    "Entreprise Recruteuse";
  const locationText =
    $(".job-location, .location").first().text().trim() ||
    "République Démocratique du Congo";
  const dateText = $(".job-date, .date").first().text().trim();
  const descriptionText = $(".job-summary, .search-description")
    .first()
    .text()
    .replace(/\s+/g, " ")
    .trim();

  return {
    externalId: deriveExternalId(payload.url || ""),
    source: "emploi_cd",
    title,
    company,
    url: payload.url,
    description: descriptionText || title,
    postedAt: parseFrenchDate(dateText),
    country: "Democratic Republic of the Congo",
    countryCode: "CD",
    city: locationText,
    workplaceType: "on-site",
  };
}

export class EmploiCdAdapter extends BaseJobSourceAdapter<EmploiCdRawPayload> {
  readonly id = "emploi_cd" as const;

  extractExternalId(raw: EmploiCdRawPayload): string {
    return deriveExternalId(raw.url);
  }

  protected async fetchRawInternal(category?: string): Promise<EmploiCdRawPayload[]> {
    const items = await fetchRaw({ keyword: category });
    return items.map((i) => i.payload as EmploiCdRawPayload);
  }

  normalize(raw: EmploiCdRawPayload): NormalizedJobInput {
    return normalize(raw);
  }
}
