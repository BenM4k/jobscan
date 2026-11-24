import "server-only";

import { BaseJobSourceAdapter } from "./base";
import { fetchReliefWebJobs } from "@/services/crawler/sources/reliefweb";
import type { CrawledJob } from "@/services/crawler/types";
import type { NormalizedJobInput, RawJobItem } from "./types";

/** Fetches raw DRC-focused humanitarian/tech postings from ReliefWeb API v2. */
export async function fetchRaw(options?: {
  target?: string;
  keyword?: string;
}): Promise<RawJobItem[]> {
  const keyword = options?.target || options?.keyword;
  const { jobs } = await fetchReliefWebJobs(keyword);
  return jobs.map((job) => ({
    externalId: job.externalId,
    payload: job,
  }));
}

/** Maps a ReliefWeb CrawledJob payload into canonical NormalizedJobInput. */
export function normalize(raw: unknown): NormalizedJobInput {
  const item = raw as CrawledJob;
  return {
    externalId: String(item.externalId),
    source: "reliefweb",
    title: item.title || "Untitled Position",
    company: item.company || "ReliefWeb Partner",
    url: item.url,
    description: item.description || "No description provided.",
    postedAt: item.postedAt ? new Date(item.postedAt) : new Date(),
    country: item.country ?? "Democratic Republic of the Congo",
    countryCode: item.countryCode ?? "CD",
    city: item.city,
    workplaceType: item.workplaceType ?? "on-site",
  };
}

/** Class-based ReliefWeb source adapter implementing BaseJobSourceAdapter. */
export class ReliefWebAdapter extends BaseJobSourceAdapter<CrawledJob> {
  readonly id = "reliefweb" as const;

  extractExternalId(raw: CrawledJob): string {
    return String(raw.externalId);
  }

  protected async fetchRawInternal(target?: string): Promise<CrawledJob[]> {
    const { jobs } = await fetchReliefWebJobs(target);
    return jobs;
  }

  normalize(raw: CrawledJob): NormalizedJobInput {
    return normalize(raw);
  }
}
