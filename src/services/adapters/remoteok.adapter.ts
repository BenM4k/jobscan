import { JobSource, NormalizedJob } from "./types";

interface RemoteOKJobRaw {
  id: string;
  position: string;
  company: string;
  url: string;
  description: string;
  date: string;
  location?: string;
  region?: string;
}

export class RemoteOKAdapter implements JobSource {
  id = "remoteok" as const;

  async fetchRaw(category?: string): Promise<RemoteOKJobRaw[]> {
    const queryTag = category?.trim().toLowerCase().replace(/\s+/g, "-");
    const url = queryTag ? `https://remoteok.com/api?tag=${encodeURIComponent(queryTag)}` : "https://remoteok.com/api";
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
      if (category && category.trim()) {
        const term = category.trim().toLowerCase();
        return valid.filter(
          (j) =>
            j.position?.toLowerCase().includes(term) ||
            j.description?.toLowerCase().includes(term)
        );
      }
      return valid;
    }
    return [];
  }


  normalize(raw: RemoteOKJobRaw): NormalizedJob {
    const region = raw.location || raw.region;
    return {
      externalId: String(raw.id),
      source: "remoteok",
      title: raw.position,
      company: raw.company,
      url: raw.url,
      description: raw.description || "",
      postedAt: raw.date ? new Date(raw.date) : new Date(),
      workplaceType: "remote",
      remoteRegions: region ? [region] : ["Worldwide"],
    };
  }
}
