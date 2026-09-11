import "server-only";
import * as cheerio from "cheerio";
import { BaseJobSourceAdapter } from "./base";
import type { NormalizedJobInput, RawJobItem } from "./types";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const MAX_PAGES = 3;
const PAGE_DELAY_MS = 250;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function deriveExternalId(url: string): string {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.replace(/\/$/, "");
    const parts = pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || pathname;
  } catch {
    return url.replace(/[^a-zA-Z0-9_-]/g, "_");
  }
}

function parseFrenchDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const trimmed = dateStr.trim();
  const parts = trimmed.split("/");
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

export interface CongoJobRawPayload {
  html: string;
  url: string;
}

/**
 * Fetch raw HTML cards directly from CongoJob without field mapping (I/O only).
 */
export async function fetchRaw(options?: {
  target?: string;
  keyword?: string;
}): Promise<RawJobItem[]> {
  const keyword = options?.target || options?.keyword;
  const encodedKw = keyword?.trim() ? encodeURIComponent(keyword.trim()) : "";
  const maxPages = encodedKw ? 3 : MAX_PAGES;
  const rawItems: RawJobItem[] = [];

  for (let page = 1; page <= maxPages; page++) {
    if (page > 1) {
      await delay(PAGE_DELAY_MS);
    }

    let pageUrl =
      page === 1
        ? "https://congojob.cd/jobs-list/"
        : `https://congojob.cd/jobs-list/page/${page}/`;

    if (encodedKw) {
      pageUrl += `?search_keywords=${encodedKw}`;
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
        if (page > 1 && res.status === 404) {
          break;
        }
        throw new Error(`CongoJob returned HTTP status ${res.status}`);
      }

      const html = await res.text();
      const $ = cheerio.load(html);
      const cards = $(".pxp-jobs-card-3");
      if (cards.length === 0) {
        break;
      }

      cards.each((_, el) => {
        const $card = $(el);
        const $titleLink = $card.find("a.pxp-jobs-card-3-title").first();
        let href = $titleLink.attr("href");
        if (!href) return;

        if (href.startsWith("/")) {
          href = `https://congojob.cd${href}`;
        }

        const externalId = deriveExternalId(href);
        const cardHtml = $.html(el);

        rawItems.push({
          externalId,
          payload: {
            html: cardHtml,
            url: href,
          } satisfies CongoJobRawPayload,
        });
      });
    } catch (err: unknown) {
      if (page === 1) {
        throw err;
      }
      break;
    }
  }

  return rawItems;
}

/**
 * Pure function: strips HTML to plain text and maps CongoJob payload to NormalizedJobInput (no I/O).
 */
export function normalize(raw: unknown): NormalizedJobInput {
  const payload = raw as CongoJobRawPayload;
  const $ = cheerio.load(payload.html || "");

  const $titleLink = $("a.pxp-jobs-card-3-title").first();
  const rawTitle = $titleLink.text().replace(/\s+/g, " ").trim();
  const title = rawTitle || "Offre d'emploi CongoJob";

  const locationText =
    $("a.pxp-jobs-card-3-location")
      .text()
      .replace(/\s+/g, " ")
      .trim() || undefined;
  const categoryText = $(
    ".pxp-jobs-card-3-category-label"
  )
    .text()
    .trim();
  const dateText = $(".pxp-jobs-card-3-date").text().trim();

  // Strip all HTML to plain text for description
  const cleanDescription = categoryText
    ? `Domaine: ${categoryText}. ${title}`
    : $.text().replace(/\s+/g, " ").trim();

  let company = "CongoJob Listing";
  const $companyLogo = $(".pxp-jobs-card-3-company-logo");
  const companyStyle = $companyLogo.attr("style") || "";
  if (companyStyle.includes("/uploads/")) {
    const match = companyStyle.match(/\/([^\/]+)\.(png|jpg|jpeg|webp)/i);
    if (match && match[1]) {
      company = match[1].replace(/[-_]/g, " ").toUpperCase();
    }
  }
  if (company === "CongoJob Listing" && title.includes("–")) {
    const titleParts = title.split("–");
    if (titleParts.length > 1) {
      company = titleParts[titleParts.length - 1].trim();
    }
  } else if (company === "CongoJob Listing" && title.includes("-")) {
    const titleParts = title.split("-");
    if (titleParts.length > 1) {
      company = titleParts[titleParts.length - 1].trim();
    }
  }

  const externalId = deriveExternalId(payload.url || "");

  return {
    externalId,
    source: "congojob",
    title,
    company,
    url: payload.url,
    description: cleanDescription,
    postedAt: parseFrenchDate(dateText),
    country: "Democratic Republic of the Congo",
    countryCode: "CD",
    city: locationText,
    workplaceType: "on-site",
  };
}

export class CongoJobAdapter extends BaseJobSourceAdapter<CongoJobRawPayload> {
  readonly id = "congojob" as const;

  extractExternalId(raw: CongoJobRawPayload): string {
    return deriveExternalId(raw.url);
  }

  protected async fetchRawInternal(category?: string): Promise<CongoJobRawPayload[]> {
    const items = await fetchRaw({ keyword: category });
    return items.map((i) => i.payload as CongoJobRawPayload);
  }

  normalize(raw: CongoJobRawPayload): NormalizedJobInput {
    return normalize(raw);
  }
}
