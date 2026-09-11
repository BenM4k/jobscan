import { CrawledJob, CrawlSourceResult } from "../types";
import {
  fetchRaw,
  normalize,
  UnJobsRawPayload,
} from "@/services/adapters/unjobs.adapter";

export { fetchRaw, normalize, type UnJobsRawPayload };

export async function fetchUnJobsJobs(
  keyword?: string
): Promise<{ jobs: CrawledJob[]; result: CrawlSourceResult }> {
  const rawItems = await fetchRaw({ keyword });
  const kw = keyword?.trim().toLowerCase();
  const jobs: CrawledJob[] = [];

  for (const item of rawItems) {
    try {
      const norm = normalize(item.payload);
      if (
        kw &&
        !norm.title.toLowerCase().includes(kw) &&
        !norm.company.toLowerCase().includes(kw)
      ) {
        continue;
      }
      jobs.push({
        source: "unjobs",
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
        `[UNjobs Crawler] Error normalizing item ${item.externalId}:`,
        e
      );
    }
  }

  return {
    jobs,
    result: {
      source: "unjobs",
      fetched: rawItems.length,
      matched: jobs.length,
      upserted: 0,
    },
  };
}
