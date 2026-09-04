import * as cheerio from "cheerio";
import { CrawledJob, CrawlSourceResult } from "../types";

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

export async function fetchEmploiCdJobs(keyword?: string): Promise<{ jobs: CrawledJob[]; result: CrawlSourceResult }> {
  let totalFetched = 0;
  const jobs: CrawledJob[] = [];
  const encodedKw = keyword?.trim() ? encodeURIComponent(keyword.trim()) : "";

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
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error(`Cloudflare bot protection or HTTP 403 active on www.emploi.cd (status ${res.status})`);
        }
        throw new Error(`emploi.cd returned HTTP status ${res.status}`);
      }

      const html = await res.text();
      // Cheerio selectors inspected on 2026-08-06
      const $ = cheerio.load(html);

      // Select job card containers
      const cards = $(".job-search-result, .search-results-job-item, .job-description-wrapper, article.job-item");
      if (cards.length === 0) {
        break;
      }

      totalFetched += cards.length;

      cards.each((_, el) => {
        const $card = $(el);
        const $link = $card.find("a[href*='/offre-emploi-']").first() || $card.find("h5 a, h3 a, a.job-title").first();
        
        let href = $link.attr("href");
        if (!href) return;

        if (href.startsWith("/")) {
          href = `https://www.emploi.cd${href}`;
        }

        const title = $link.text().trim() || $card.find("h5, h3, .job-title").text().trim();
        if (!title) return;

        const company = $card.find(".company-name, .job-company, .employer").text().trim() || "Société en RDC";
        const city = $card.find(".job-location, .location, .city").text().trim() || undefined;
        const description = $card.find(".job-snippet, .description, p").first().text().trim() || title;
        const dateText = $card.find(".job-date, .date, time").text().trim();

        const externalId = deriveExternalId(href);

        jobs.push({
          source: "emploicd",
          externalId,
          title,
          company,
          url: href,
          description,
          postedAt: dateText ? new Date(dateText) : new Date(),
          country: "Democratic Republic of the Congo",
          countryCode: "CD",
          city,
          workplaceType: "on-site",
        });
      });
    } catch (err: unknown) {
      if (page === 0) {
        throw err;
      }
      break;
    }
  }

  return {
    jobs,
    result: {
      source: "emploicd",
      fetched: totalFetched,
      matched: jobs.length,
      upserted: 0,
    },
  };
}
