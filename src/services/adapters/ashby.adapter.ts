import "server-only";
import { BaseJobSourceAdapter } from "./base";
import { type NormalizedJob, isValidCountry } from "./types";

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

export class AshbyAdapter extends BaseJobSourceAdapter<AshbyJobRaw> {
  readonly id = "ashby" as const;

  extractExternalId(raw: AshbyJobRaw): string {
    return String(raw.id);
  }

  protected async fetchRawInternal(category = "software"): Promise<AshbyJobRaw[]> {
    const organization = "notion";
    const url = `https://api.ashbyhq.com/posting-api/job-board/${organization}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      throw new Error(`Ashby API request failed with status ${res.status}`);
    }
    const data = await res.json();
    const rawList: AshbyJobRaw[] = data.jobs || [];
    const jobsList = rawList.filter((j) => j.isListed !== false);

    if (category && category.trim()) {
      const term = category.trim().toLowerCase();
      return jobsList.filter(
        (j) =>
          j.title?.toLowerCase().includes(term) ||
          j.descriptionHtml?.toLowerCase().includes(term)
      );
    }

    return jobsList;
  }

  normalize(raw: AshbyJobRaw): NormalizedJob {
    const isRemote =
      Boolean(raw.isRemote) ||
      (raw.location ? /remote/i.test(raw.location) : false);
    const workplaceType = isRemote
      ? "remote"
      : raw.location
      ? "on-site"
      : undefined;
    const city =
      raw.address?.postalAddress?.addressLocality ||
      (raw.location && !/remote/i.test(raw.location)
        ? raw.location.split(",")[0]?.trim()
        : undefined);
    const rawCountry =
      raw.address?.postalAddress?.addressCountry ||
      (raw.location && raw.location.includes(",")
        ? raw.location.split(",").pop()?.trim()
        : undefined);
    const country = isValidCountry(rawCountry) ? rawCountry : undefined;

    let postedAt: Date | undefined;
    if (raw.publishedAt) {
      const parsed = new Date(raw.publishedAt);
      if (!isNaN(parsed.getTime())) {
        postedAt = parsed;
      }
    }

    return {
      externalId: raw.id,
      source: "ashby",
      title: raw.title,
      company: "Notion",
      url: raw.jobUrl,
      description: raw.descriptionHtml || "",
      postedAt,
      city,
      country,
      workplaceType,
      remoteRegions: isRemote ? ["Worldwide"] : undefined,
    };
  }
}
