import "server-only";
import { BaseJobSourceAdapter } from "./base";
import type { NormalizedJobInput, RawJobItem } from "./types";

/**
 * FEC RDC (Fédération des Entreprises du Congo) Source Adapter.
 * Institutional website publishing news and announcements without a dedicated job board.
 * Returns empty array gracefully.
 */
export async function fetchRaw(): Promise<RawJobItem[]> {
  return [];
}

export function normalize(raw: unknown): NormalizedJobInput {
  const item = (raw || {}) as Record<string, unknown>;
  return {
    externalId: String(item.externalId || "unknown"),
    source: "fecrdc",
    title: String(item.title || "Offre FEC RDC"),
    company: String(item.company || "FEC RDC"),
    url: typeof item.url === "string" ? item.url : undefined,
    description: String(item.description || "Description non disponible"),
    postedAt: new Date(),
    country: "Democratic Republic of the Congo",
    countryCode: "CD",
    workplaceType: "on-site",
  };
}

export class FecRdcAdapter extends BaseJobSourceAdapter<Record<string, unknown>> {
  readonly id = "fecrdc" as const;

  extractExternalId(raw: Record<string, unknown>): string {
    return String(raw.externalId || "unknown");
  }

  protected async fetchRawInternal(): Promise<Record<string, unknown>[]> {
    return [];
  }

  normalize(raw: Record<string, unknown>): NormalizedJobInput {
    return normalize(raw);
  }
}
