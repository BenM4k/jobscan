import "server-only";
import { BaseJobSourceAdapter } from "./base";
import { type NormalizedJobInput, type RawJobItem, isValidCountry } from "./types";

export interface AshbyJobRaw {
  id: string;
  title: string;
  jobUrl: string;
  descriptionHtml?: string;
  publishedAt?: string;
  location?: string;
  locationName?: string;
  isRemote?: boolean;
  isListed?: boolean;
  address?: {
    postalAddress?: {
      addressCountry?: string;
      addressLocality?: string;
    };
  };
}

/**
 * Fetch raw job payloads from Ashby without field mapping (I/O only).
 */
export async function fetchRaw(options?: {
  target?: string;
  category?: string;
}): Promise<RawJobItem[]> {
  const organization = options?.target || "notion";
  const category = options?.category || "software";
  const url = `https://api.ashbyhq.com/posting-api/job-board/${organization}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) {
    throw new Error(`Ashby API request failed with status ${res.status}`);
  }
  const data = await res.json();
  const rawList: AshbyJobRaw[] = data.jobs || [];
  const jobsList = rawList.filter((j) => j.isListed !== false);

  const filtered =
    category && category.trim()
      ? jobsList.filter((j) => {
          const term = category.trim().toLowerCase();
          return (
            j.title?.toLowerCase().includes(term) ||
            j.descriptionHtml?.toLowerCase().includes(term)
          );
        })
      : jobsList;

  return filtered.map((item) => ({
    externalId: String(item.id),
    payload: item,
  }));
}

/**
 * Pure function: maps raw Ashby payload to the shared NormalizedJobInput shape (no I/O).
 */
export function normalize(raw: unknown): NormalizedJobInput {
  const item = raw as AshbyJobRaw;
  const isRemote =
    Boolean(item.isRemote) ||
    (item.location ? /remote/i.test(item.location) : false);
  const workplaceType = isRemote
    ? "remote"
    : item.location
    ? "on-site"
    : undefined;
  const city =
    item.address?.postalAddress?.addressLocality ||
    (item.location && !/remote/i.test(item.location)
      ? item.location.split(",")[0]?.trim()
      : undefined);
  const rawCountry =
    item.address?.postalAddress?.addressCountry ||
    (item.location && item.location.includes(",")
      ? item.location.split(",").pop()?.trim()
      : undefined);
  const country = isValidCountry(rawCountry) ? rawCountry : undefined;

  let postedAt: Date | undefined;
  if (item.publishedAt) {
    const parsed = new Date(item.publishedAt);
    if (!isNaN(parsed.getTime())) {
      postedAt = parsed;
    }
  }

  return {
    externalId: String(item.id),
    source: "ashby",
    title: item.title,
    company: "Notion",
    url: item.jobUrl,
    description: item.descriptionHtml || "",
    postedAt,
    city,
    country,
    workplaceType,
    remoteRegions: isRemote ? ["Worldwide"] : undefined,
  };
}

export class AshbyAdapter extends BaseJobSourceAdapter<AshbyJobRaw> {
  readonly id = "ashby" as const;

  extractExternalId(raw: AshbyJobRaw): string {
    return String(raw.id);
  }

  protected async fetchRawInternal(category = "software"): Promise<AshbyJobRaw[]> {
    const rawItems = await fetchRaw({ category });
    return rawItems.map((r) => r.payload as AshbyJobRaw);
  }

  normalize(raw: AshbyJobRaw): NormalizedJobInput {
    return normalize(raw);
  }
}
