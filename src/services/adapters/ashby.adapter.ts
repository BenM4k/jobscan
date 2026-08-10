import { JobSource, NormalizedJob } from "./types";

interface AshbyJobRaw {
  id: string;
  title: string;
  jobUrl: string;
  descriptionHtml?: string;
  publishedAt?: string;
  locationName?: string;
  isRemote?: boolean;
  address?: {
    postalAddress?: {
      addressCountry?: string;
      addressLocality?: string;
    };
  };
}

export class AshbyAdapter implements JobSource {
  id = "ashby" as const;

  async fetchRaw(category = "software"): Promise<AshbyJobRaw[]> {
    const organization = "notion";
    const url = `https://api.ashbyhq.com/posting-api/job-board/${organization}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Ashby API request failed with status ${res.status}`);
    }
    const data = await res.json();
    const jobsList: AshbyJobRaw[] = data.jobs || [];

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
    const isRemote = raw.isRemote || (raw.locationName ? /remote/i.test(raw.locationName) : false) || /remote/i.test(raw.title);
    const workplaceType = isRemote ? "remote" : raw.locationName ? "on-site" : undefined;
    const city = raw.address?.postalAddress?.addressLocality || (raw.locationName && !/remote/i.test(raw.locationName) ? raw.locationName.split(",")[0]?.trim() : undefined);
    const country = raw.address?.postalAddress?.addressCountry || (raw.locationName && raw.locationName.includes(",") ? raw.locationName.split(",").pop()?.trim() : undefined);

    return {
      externalId: raw.id,
      source: "ashby",
      title: raw.title,
      company: "Ashby Board",
      url: raw.jobUrl,
      description: raw.descriptionHtml || "",
      postedAt: raw.publishedAt ? new Date(raw.publishedAt) : new Date(),
      city,
      country,
      workplaceType,
      remoteRegions: isRemote ? ["Worldwide"] : undefined,
    };
  }
}
