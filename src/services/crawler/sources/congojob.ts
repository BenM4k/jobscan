import * as cheerio from "cheerio";
import { CrawledJob, CrawlSourceResult } from "../types";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const MAX_PAGES = 5;
const PAGE_DELAY_MS = 1000;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function deriveExternalId(url: string): string {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.replace(/\/$/, "");
    const parts = pathname.split("/").filter(Boolean);
    const lastPart = parts[parts.length - 1] || pathname;
    return lastPart;
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

export async function fetchCongoJobJobs(): Promise<{ jobs: CrawledJob[]; result: CrawlSourceResult }> {
  let totalFetched = 0;
  const jobs: CrawledJob[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    if (page > 1) {
      await delay(PAGE_DELAY_MS);
    }

    const pageUrl = page === 1
      ? "https://congojob.cd/jobs-list/"
      : `https://congojob.cd/jobs-list/page/${page}/`;

    try {
      const res = await fetch(pageUrl, {
        headers: {
          "User-Agent": USER_AGENT,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      if (!res.ok) {
        if (page > 1 && res.status === 404) {
          // Reached end of pagination
          break;
        }
        throw new Error(`CongoJob returned HTTP status ${res.status}`);
      }

      const html = await res.text();
      // Cheerio selectors inspected on 2026-08-06
      const $ = cheerio.load(html);

      const cards = $(".pxp-jobs-card-3");
      if (cards.length === 0) {
        break;
      }

      totalFetched += cards.length;

      cards.each((_, el) => {
        const $card = $(el);
        const $titleLink = $card.find("a.pxp-jobs-card-3-title").first();

        let href = $titleLink.attr("href");
        if (!href) return;

        if (href.startsWith("/")) {
          href = `https://congojob.cd${href}`;
        }

        const title = $titleLink.text().replace(/\s+/g, " ").trim();
        if (!title) return;

        const locationText = $card.find("a.pxp-jobs-card-3-location").text().replace(/\s+/g, " ").trim() || undefined;
        const categoryText = $card.find(".pxp-jobs-card-3-category-label").text().trim();
        const dateText = $card.find(".pxp-jobs-card-3-date").text().trim();

        // Extract company if title contains hyphens or company link exists
        let company = "CongoJob Listing";
        const $companyLogo = $card.find(".pxp-jobs-card-3-company-logo");
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

        const externalId = deriveExternalId(href);

        jobs.push({
          source: "congojob",
          externalId,
          title,
          company,
          url: href,
          description: categoryText ? `Domaine: ${categoryText}` : title,
          postedAt: parseFrenchDate(dateText),
          country: "Democratic Republic of the Congo",
          countryCode: "CD",
          city: locationText,
          workplaceType: "on-site",
        });
      });
    } catch (err: unknown) {
      if (page === 1) {
        throw err;
      }
      break;
    }
  }

  return {
    jobs,
    result: {
      source: "congojob",
      fetched: totalFetched,
      matched: jobs.length,
      upserted: 0,
    },
  };
}
