import { CrawledJob, CrawlSourceResult } from "../types";
import { isDrcJob } from "../drc-filter";

// Known RemoteOK tag slugs that map exactly to RemoteOK's tag taxonomy.
// Free-text keywords not in this set are not sent as tag queries — they would
// return 0 or irrelevant results because RemoteOK tags are curated slugs, not
// arbitrary search terms. Local filtering in run.ts handles the text match.
const KNOWN_REMOTEOK_TAGS = new Set([
  "javascript", "typescript", "python", "golang", "rust", "ruby", "php",
  "java", "kotlin", "swift", "react", "vue", "angular", "nodejs", "django",
  "rails", "aws", "gcp", "azure", "devops", "docker", "kubernetes", "linux",
  "design", "marketing", "sales", "finance", "legal", "hr", "ops", "data",
  "machine-learning", "ai", "blockchain", "crypto", "saas", "b2b",
]);

function toTagSlug(kw: string): string {
  return kw.trim().toLowerCase().replace(/\s+/g, "-");
}

export async function fetchRemoteOKJobs(keyword?: string): Promise<{ jobs: CrawledJob[]; result: CrawlSourceResult }> {
  const kw = keyword?.trim();
  const tagSlug = kw ? toTagSlug(kw) : undefined;
  // Only use the tag endpoint when the keyword exactly matches a known tag slug;
  // otherwise always use the broad /api to let local filtering do the work.
  const url =
    tagSlug && KNOWN_REMOTEOK_TAGS.has(tagSlug)
      ? `https://remoteok.com/api?tag=${encodeURIComponent(tagSlug)}`
      : "https://remoteok.com/api";

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
