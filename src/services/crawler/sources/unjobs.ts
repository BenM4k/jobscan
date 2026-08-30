import * as cheerio from "cheerio";
import { CrawledJob, CrawlSourceResult } from "../types";
import { isDrcJob } from "../drc-filter";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

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

export async function fetchUnJobsJobs(keyword?: string): Promise<{ jobs: CrawledJob[]; result: CrawlSourceResult }> {
  const url = "https://unjobs.org/duty_stations/fih";
  const matchedJobs: CrawledJob[] = [];
  let totalFetched = 0;
  const kw = keyword?.trim().toLowerCase();

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!res.ok) {
      throw new Error(`UNjobs returned HTTP status ${res.status}`);
    }

    const html = await res.text();
    // Cheerio selectors inspected on 2026-08-06
    const $ = cheerio.load(html);

    const cards = $("div.job");

    cards.each((_, el) => {
      const $card = $(el);
      const $titleLink = $card.find("a.jtitle").first();

      let href = $titleLink.attr("href");
      if (!href) return; // Skip ad units inside div.job

      totalFetched++;

      if (href.startsWith("/")) {
        href = `https://unjobs.org${href}`;
      }

      const fullTitle = $titleLink.text().replace(/\s+/g, " ").trim();
      if (!fullTitle) return;

      const externalId = deriveExternalId(href);

      // Extract organization name from text following the title link
      const cardHtml = $card.html() || "";
      const textAfterTitle = cardHtml.split("</a>")[1] || "";
      const orgLine = textAfterTitle.split("<br>")[1] || textAfterTitle.split("<br/>")[1] || "";
      const company = cheerio.load(orgLine).text().trim() || "UN / International Organization";

      // Extract ISO date from <time class="upd">
      const dateStr = $card.find("time.upd").attr("datetime") || $card.find("time.upd").text().trim();

      const candidate: CrawledJob = {
        source: "unjobs",
        externalId,
        title: fullTitle,
        company,
        url: href,
        description: fullTitle,
        postedAt: dateStr ? new Date(dateStr) : new Date(),
        city: "Kinshasa",
        country: "Democratic Republic of the Congo",
        countryCode: "CD",
        workplaceType: "on-site",
      };

      if (isDrcJob(candidate)) {
        if (!kw || fullTitle.toLowerCase().includes(kw) || company.toLowerCase().includes(kw)) {
          matchedJobs.push(candidate);
        }
      }
    });

    return {
      jobs: matchedJobs,
      result: {
        source: "unjobs",
        fetched: totalFetched,
        matched: matchedJobs.length,
        upserted: 0,
      },
    };
  } catch (error: unknown) {
    return {
      jobs: [],
      result: {
        source: "unjobs",
        fetched: 0,
        matched: 0,
        upserted: 0,
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}
