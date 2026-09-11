import "server-only";
import { BaseJobSourceAdapter } from "./base";
import { type NormalizedJobInput, type RawJobItem, isValidCountry } from "./types";

export interface LeverJobRaw {
  id: string;
  text: string;
  hostedUrl: string;
  descriptionPlain: string;
  createdAt: number;
  categories?: {
    location?: string;
    workplaceType?: string;
    commitment?: string;
  };
}

/**
 * Fetch raw job payloads from Lever without field mapping (I/O only).
 */
export async function fetchRaw(options?: {
  target?: string;
  category?: string;
}): Promise<RawJobItem[]> {
  const site = options?.target || "netflix";
  const category = options?.category || "software";
  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(site)}?mode=json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Lever API request failed with status ${res.status}`);
  }
  const data = await res.json();
  const jobsList: LeverJobRaw[] = Array.isArray(data) ? data : [];

  const filtered =
    category && category.trim()
      ? jobsList.filter((j) => {
          const term = category.trim().toLowerCase();
          return (
            j.text?.toLowerCase().includes(term) ||
            j.descriptionPlain?.toLowerCase().includes(term)
          );
        })
      : jobsList;

  return filtered.map((item) => ({
    externalId: String(item.id),
    payload: item,
  }));
}

/**
 * Pure function: maps raw Lever payload to the shared NormalizedJobInput shape (no I/O).
 */
export function normalize(raw: unknown): NormalizedJobInput {
  const item = raw as LeverJobRaw;
  const locName = item.categories?.location;
  const leverWp = item.categories?.workplaceType?.toLowerCase();
  const isRemote =
    leverWp === "remote" ||
    (locName ? /remote/i.test(locName) : false) ||
    /remote/i.test(item.text);
  const workplaceType: "remote" | "on-site" | "hybrid" | undefined = isRemote
    ? "remote"
    : leverWp === "hybrid"
    ? "hybrid"
    : leverWp === "onsite" || leverWp === "on-site" || locName
    ? "on-site"
    : undefined;

  let city: string | undefined;
  let country: string | undefined;
  if (locName && !/remote/i.test(locName)) {
    const parts = locName.split(",").map((s) => s.trim());
    if (parts.length > 1) {
      city = parts[0];
      const suffix = parts[parts.length - 1];
      country = isValidCountry(suffix) ? suffix : undefined;
    } else {
      city = locName;
    }
  }

  return {
    externalId: item.id,
    source: "lever",
    title: item.text,
    company: "Netflix",
    url: item.hostedUrl,
    description: item.descriptionPlain || "",
    postedAt: item.createdAt ? new Date(item.createdAt) : new Date(),
    city,
    country,
    workplaceType,
    remoteRegions: isRemote ? ["Worldwide"] : undefined,
  };
}

export class LeverAdapter extends BaseJobSourceAdapter<LeverJobRaw> {
  readonly id = "lever" as const;

  extractExternalId(raw: LeverJobRaw): string {
    return String(raw.id);
  }

  protected async fetchRawInternal(category = "software"): Promise<LeverJobRaw[]> {
    const rawItems = await fetchRaw({ category });
    return rawItems.map((r) => r.payload as LeverJobRaw);
  }

  normalize(raw: LeverJobRaw): NormalizedJobInput {
    return normalize(raw);
  }
}
