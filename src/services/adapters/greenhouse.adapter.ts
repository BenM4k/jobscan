import "server-only";
import { BaseJobSourceAdapter } from "./base";
import { type NormalizedJob, isValidCountry } from "./types";

export interface GreenhouseJobRaw {
  id: number;
  title: string;
  absolute_url: string;
  updated_at: string;
  content?: string;
  location?: { name: string };
}

function decodeHtmlEntities(text: string): string {
  let prev = text;
  for (let i = 0; i < 3; i++) {
    const decoded = prev
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&apos;/gi, "'")
      .replace(/&nbsp;/gi, " ")
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    if (decoded === prev) break;
    prev = decoded;
  }
  return prev;
}

export class GreenhouseAdapter extends BaseJobSourceAdapter<GreenhouseJobRaw> {
  readonly id = "greenhouse" as const;

  extractExternalId(raw: GreenhouseJobRaw): string {
    return String(raw.id);
  }

  protected async fetchRawInternal(category = "software"): Promise<GreenhouseJobRaw[]> {
    const boardToken = "airbnb";
    const url = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs?content=true`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Greenhouse API request failed with status ${res.status}`);
    }
    const data = await res.json();
    const jobsList: GreenhouseJobRaw[] = data.jobs || [];

    if (category && category.trim()) {
      const term = category.trim().toLowerCase();
      return jobsList.filter(
        (j) =>
          j.title?.toLowerCase().includes(term) ||
          j.content?.toLowerCase().includes(term)
      );
    }

    return jobsList;
  }

  normalize(raw: GreenhouseJobRaw): NormalizedJob {
    const decodedContent = decodeHtmlEntities(raw.content || "No description provided.");
    const cleanDescription = decodedContent
      .replace(/<[^>]*>?/gm, "")
      .replace(/\s+/g, " ")
      .trim();

    const locName = raw.location?.name?.trim();
    const isRemote = locName
      ? /remote/i.test(locName) || /remote/i.test(raw.title)
      : /remote/i.test(raw.title);
    const workplaceType = isRemote ? "remote" : locName ? "on-site" : undefined;

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
      externalId: String(raw.id),
      source: "greenhouse",
      title: raw.title?.trim() || "Untitled Position",
      company: "Airbnb",
      url: raw.absolute_url,
      description: cleanDescription,
      postedAt: raw.updated_at ? new Date(raw.updated_at) : new Date(),
      city,
      country,
      workplaceType,
      remoteRegions: isRemote ? ["Worldwide"] : undefined,
    };
  }
}
