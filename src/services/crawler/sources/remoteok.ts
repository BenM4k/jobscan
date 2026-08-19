import { CrawledJob, CrawlSourceResult } from "../types";
import { isDrcJob } from "../drc-filter";

export async function fetchRemoteOKJobs(): Promise<{ jobs: CrawledJob[]; result: CrawlSourceResult }> {
  const url = "https://remoteok.com/api";

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "JobPilot/1.0",
        "Accept-Encoding": "identity",
      },
    });

    if (!res.ok) {
      throw new Error(`RemoteOK API returned status ${res.status}`);
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      throw new Error("Invalid RemoteOK API response structure");
    }

    // Skip first element (legal notice)
    const rawList = data.slice(1);
    const jobs: CrawledJob[] = [];

    for (const item of rawList) {
      if (!item || !item.id) continue;

      const region = item.location || item.region;
      const candidate: CrawledJob = {
        source: "remoteok",
        externalId: String(item.id),
        title: item.position || "Untitled Position",
        company: item.company || "RemoteOK",
        url: item.url || `https://remoteok.com/remote-jobs/${item.id}`,
        description: item.description || "",
        postedAt: item.date ? new Date(item.date) : new Date(),
        workplaceType: "remote",
        remoteRegions: region ? [region] : ["Worldwide"],
      };

      if (isDrcJob(candidate)) {
        jobs.push(candidate);
      }
    }

    return {
      jobs,
      result: {
        source: "remoteok",
        fetched: rawList.length,
        matched: jobs.length,
        upserted: 0,
      },
    };
  } catch (error: unknown) {
    return {
      jobs: [],
      result: {
        source: "remoteok",
        fetched: 0,
        matched: 0,
        upserted: 0,
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}
