import "server-only";
import { BaseJobSourceAdapter } from "./base";
import type { NormalizedJob } from "./types";

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

export class LeverAdapter extends BaseJobSourceAdapter<LeverJobRaw> {
  readonly id = "lever" as const;

  extractExternalId(raw: LeverJobRaw): string {
    return String(raw.id);
  }

  protected async fetchRawInternal(category = "software"): Promise<LeverJobRaw[]> {
    const site = "netflix";
    const url = `https://api.lever.co/v0/postings/${site}?mode=json`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Lever API request failed with status ${res.status}`);
    }
    const data = await res.json();
    const jobsList: LeverJobRaw[] = Array.isArray(data) ? data : [];

    if (category && category.trim()) {
      const term = category.trim().toLowerCase();
      return jobsList.filter(
        (j) =>
          j.text?.toLowerCase().includes(term) ||
          j.descriptionPlain?.toLowerCase().includes(term)
      );
    }

    return jobsList;
  }

  normalize(raw: LeverJobRaw): NormalizedJob {
    const locName = raw.categories?.location;
    const leverWp = raw.categories?.workplaceType?.toLowerCase();
    const isRemote =
      leverWp === "remote" ||
      (locName ? /remote/i.test(locName) : false) ||
      /remote/i.test(raw.text);
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
        country = parts[parts.length - 1];
      } else {
        city = locName;
      }
    }

    return {
      externalId: raw.id,
      source: "lever",
      title: raw.text,
      company: "Lever Posting",
      url: raw.hostedUrl,
      description: raw.descriptionPlain || "",
      postedAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
      city,
      country,
      workplaceType,
      remoteRegions: isRemote ? ["Worldwide"] : undefined,
    };
  }
}
