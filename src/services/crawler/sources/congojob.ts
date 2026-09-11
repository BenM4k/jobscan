import { CrawledJob, CrawlSourceResult } from "../types";
import {
  fetchRaw,
  normalize,
  CongoJobRawPayload,
} from "@/services/adapters/congojob.adapter";

export { fetchRaw, normalize, type CongoJobRawPayload };

/**
 * DRC crawler source entry point delegating to congojob.adapter
 */
export async function fetchCongoJobJobs(
  keyword?: string
): Promise<{ jobs: CrawledJob[]; result: CrawlSourceResult }> {
  const rawItems = await fetchRaw({ keyword });
  const jobs: CrawledJob[] = [];

  for (const item of rawItems) {
    try {
      const norm = normalize(item.payload);
      jobs.push({
        source: "congojob",
        externalId: norm.externalId,
        title: norm.title,
        company: norm.company,
        url: norm.url || "",
        description: norm.description,
        postedAt: norm.postedAt || new Date(),
        country: norm.country,
        countryCode: norm.countryCode,
        city: norm.city,
        workplaceType: norm.workplaceType || "on-site",
      });
    } catch (e) {
      console.warn(
        `[CongoJob Crawler] Error normalizing item ${item.externalId}:`,
        e
      );
    }
  }

  return {
    jobs,
    result: {
      source: "congojob",
      fetched: rawItems.length,
      matched: jobs.length,
      upserted: 0,
    },
  };
}
