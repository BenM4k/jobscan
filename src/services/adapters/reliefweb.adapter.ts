import "server-only";

import { BaseJobSourceAdapter } from "./base";
import {
  fetchReliefWebJobs,
  normalizeReliefWebRawItem,
  type ReliefWebRawItem,
} from "@/services/crawler/sources/reliefweb";
import type { NormalizedJobInput, RawJobItem } from "./types";

/** Fetches untouched ReliefWeb API v2 items and propagates upstream errors for circuit breaking. */
export async function fetchRaw(options?: {
  target?: string;
  keyword?: string;
}): Promise<RawJobItem[]> {
  const keyword = options?.target || options?.keyword;
  const { items, result } = await fetchReliefWebJobs(keyword);
  if (result.error) {
    throw new Error(result.error);
  }
  return items.map((item) => ({
    externalId: String(item.id),
    payload: item,
  }));
}

/** Pure function: extracts fields, cleans HTML, and maps a raw ReliefWeb API item into canonical form. */
export function normalize(raw: unknown): NormalizedJobInput {
  const normalized = normalizeReliefWebRawItem(raw as ReliefWebRawItem);
  return {
    externalId: normalized.externalId,
    source: "reliefweb",
    title: normalized.title,
    company: normalized.company,
    url: normalized.url,
    description: normalized.description,
    postedAt: normalized.postedAt,
    country: normalized.country,
    countryCode: normalized.countryCode,
    city: normalized.city,
    workplaceType: normalized.workplaceType,
  };
}

/** Class-based ReliefWeb source adapter implementing BaseJobSourceAdapter. */
export class ReliefWebAdapter extends BaseJobSourceAdapter<ReliefWebRawItem> {
  readonly id = "reliefweb" as const;

  extractExternalId(raw: ReliefWebRawItem): string {
    return String(raw.id);
  }

  protected async fetchRawInternal(target?: string): Promise<ReliefWebRawItem[]> {
    const { items, result } = await fetchReliefWebJobs(target);
    if (result.error) {
      throw new Error(result.error);
    }
    return items;
  }

  normalize(raw: ReliefWebRawItem): NormalizedJobInput {
    return normalize(raw);
  }
}
