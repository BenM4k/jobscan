import "server-only";
import { BaseJobSourceAdapter } from "./base";
import type { NormalizedJobInput, RawJobItem } from "./types";

export interface RemoteOKJobRaw {
  id: string | number;
  position: string;
  company: string;
  url: string;
  description: string;
  date: string;
  location?: string;
  region?: string;
}

/**
 * Fetch raw job payloads from RemoteOK without field mapping (I/O only).
 */
export async function fetchRaw(options?: {
  target?: string;
  category?: string;
}): Promise<RawJobItem[]> {
  const category = options?.target || options?.category;
  const queryTag = category?.trim().toLowerCase().replace(/\s+/g, "-");
  const url = queryTag
    ? `https://remoteok.com/api?tag=${encodeURIComponent(queryTag)}`
    : "https://remoteok.com/api";
  const res = await fetch(url, {
    headers: {
      "User-Agent": "JobPilot/1.0",
      "Accept-Encoding": "identity",
    },
  });
  if (!res.ok) {
    throw new Error(`RemoteOK API request failed with status ${res.status}`);
  }
  const data = await res.json();

  if (Array.isArray(data)) {
    const valid = data.filter((item) => item && item.id) as RemoteOKJobRaw[];
    const filtered =
      category && category.trim()
        ? valid.filter((j) => {
            const term = category.trim().toLowerCase();
            return (
              j.position?.toLowerCase().includes(term) ||
              j.description?.toLowerCase().includes(term)
            );
          })
        : valid;

    return filtered.map((item) => ({
      externalId: String(item.id),
      payload: item,
    }));
  }
  return [];
}

/**
 * Pure function: maps raw RemoteOK payload to the shared NormalizedJobInput shape (no I/O).
 */
export function normalize(raw: unknown): NormalizedJobInput {
  const item = raw as RemoteOKJobRaw;
  const region = item.location || item.region;
  return {
    externalId: String(item.id),
    source: "remoteok",
    title: item.position,
    company: item.company,
    url: item.url,
    description: item.description || "",
    postedAt: item.date ? new Date(item.date) : new Date(),
    workplaceType: "remote",
    remoteRegions: region ? [region] : ["Worldwide"],
  };
}

export class RemoteOKAdapter extends BaseJobSourceAdapter<RemoteOKJobRaw> {
  readonly id = "remoteok" as const;

  extractExternalId(raw: RemoteOKJobRaw): string {
    return String(raw.id);
  }

  protected async fetchRawInternal(category?: string): Promise<RemoteOKJobRaw[]> {
    const rawItems = await fetchRaw({ category });
    return rawItems.map((r) => r.payload as RemoteOKJobRaw);
  }

  normalize(raw: RemoteOKJobRaw): NormalizedJobInput {
    return normalize(raw);
  }
}
