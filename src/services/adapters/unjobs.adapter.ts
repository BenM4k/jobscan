import "server-only";
import * as cheerio from "cheerio";
import { BaseJobSourceAdapter } from "./base";
import type { NormalizedJobInput, RawJobItem } from "./types";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

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

export interface UnJobsRawPayload {
  html: string;
  url: string;
}

/**
 * Fetch raw HTML cards from UNjobs duty stations without field mapping (I/O only).
 */
export async function fetchRaw(options?: {
  target?: string;
  keyword?: string;
}): Promise<RawJobItem[]> {
  const url = options?.target || "https://unjobs.org/duty_stations/fih";
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    throw new Error(`UNjobs returned HTTP status ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const cards = $("div.job");
  const rawItems: RawJobItem[] = [];

  cards.each((_, el) => {
    const $card = $(el);
    const $titleLink = $card.find("a.jtitle").first();
    let href = $titleLink.attr("href");
    if (!href) return;

    if (href.startsWith("/")) {
      href = `https://unjobs.org${href}`;
    }

    const externalId = deriveExternalId(href);
    const cardHtml = $.html(el);

    rawItems.push({
      externalId,
      payload: {
        html: cardHtml,
        url: href,
      } satisfies UnJobsRawPayload,
    });
  });

  return rawItems;
}

/**
 * Pure function: strips HTML to plain text and maps UNjobs payload to NormalizedJobInput (no I/O).
 */
export function normalize(raw: unknown): NormalizedJobInput {
  const payload = raw as UnJobsRawPayload;
  const $ = cheerio.load(payload.html || "");
  const $titleLink = $("a.jtitle").first();
  const fullTitle = $titleLink.text().replace(/\s+/g, " ").trim() || "UN Job Posting";

  let title = fullTitle;
  let company = "United Nations";
  if (fullTitle.includes(" - ")) {
    const parts = fullTitle.split(" - ");
    company = parts[0].trim();
    title = parts.slice(1).join(" - ").trim();
  }

  const locationText =
    $("span.job-location, font[color='#006600']").first().text().trim() ||
    "Kinshasa, DRC";

  const description = $.text().replace(/\s+/g, " ").trim();
  const externalId = deriveExternalId(payload.url || "");

  return {
    externalId,
    source: "unjobs",
    title,
    company,
    url: payload.url,
    description: description || title,
    postedAt: new Date(),
    country: "Democratic Republic of the Congo",
    countryCode: "CD",
    city: locationText,
    workplaceType: "on-site",
  };
}

export class UnJobsAdapter extends BaseJobSourceAdapter<UnJobsRawPayload> {
  readonly id = "unjobs" as const;

  extractExternalId(raw: UnJobsRawPayload): string {
    return deriveExternalId(raw.url);
  }

  protected async fetchRawInternal(category?: string): Promise<UnJobsRawPayload[]> {
    const items = await fetchRaw({ keyword: category });
    return items.map((i) => i.payload as UnJobsRawPayload);
  }

  normalize(raw: UnJobsRawPayload): NormalizedJobInput {
    return normalize(raw);
  }
}
