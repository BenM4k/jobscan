import { CrawledJob, CrawlSourceResult } from "../types";

/**
 * FEC RDC (Fédération des Entreprises du Congo) Source Scraper
 * Inspected on 2026-08-06:
 * https://fec-rdc.com is an institutional website publishing news, economic press releases,
 * and organizational announcements. It does not host a structured, dedicated job board or vacancies section.
 * To avoid scraping irrelevant news articles, this source returns an empty list gracefully.
 */
export async function fetchFecRdcJobs(): Promise<{ jobs: CrawledJob[]; result: CrawlSourceResult }> {
  return {
    jobs: [],
    result: {
      source: "fecrdc",
      fetched: 0,
      matched: 0,
      upserted: 0,
    },
  };
}
