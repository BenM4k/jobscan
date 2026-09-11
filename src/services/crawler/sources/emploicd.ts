import { CrawledJob, CrawlSourceResult } from "../types";
import {
  fetchRaw,
  normalize,
  EmploiCdRawPayload,
} from "@/services/adapters/emploicd.adapter";

export { fetchRaw, normalize, type EmploiCdRawPayload };

/**
 * DRC crawler source entry point delegating to emploicd.adapter
 */
export async function fetchEmploiCdJobs(
  keyword?: string
): Promise<{ jobs: CrawledJob[]; result: CrawlSourceResult }> {
  const rawItems = await fetchRaw({ keyword });
  const jobs: CrawledJob[] = [];

  for (const item of rawItems) {
    try {
      const norm = normalize(item.payload);
      jobs.push({
        source: "emploicd",
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
        `[Emploi.cd Crawler] Error normalizing item ${item.externalId}:`,
        e
      );
    }
  }

  return {
    jobs,
    result: {
      source: "emploicd",
      fetched: rawItems.length,
      matched: jobs.length,
      upserted: 0,
    },
  };
}
