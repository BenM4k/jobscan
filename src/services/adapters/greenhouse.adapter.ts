import { JobSource, NormalizedJob } from "./types";

interface GreenhouseJobRaw {
  id: number;
  title: string;
  absolute_url: string;
  updated_at: string;
  content?: string;
  location?: { name: string };
}

export class GreenhouseAdapter implements JobSource {
  id = "greenhouse" as const;

  async fetchRaw(category = "software"): Promise<GreenhouseJobRaw[]> {
    // If user inputs a category term, search across multi-board seeds or filter returned jobs
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
    const cleanDescription = (raw.content || "No description provided.")
      .replace(/<[^>]*>?/gm, "")
      .replace(/\s+/g, " ")
      .trim();

    const locName = raw.location?.name?.trim();
    const isRemote = locName ? /remote/i.test(locName) || /remote/i.test(raw.title) : /remote/i.test(raw.title);
    const workplaceType = isRemote ? "remote" : locName ? "on-site" : undefined;

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
      externalId: String(raw.id),
      source: "greenhouse",
      title: raw.title?.trim() || "Untitled Position",
      company: "Greenhouse",
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

