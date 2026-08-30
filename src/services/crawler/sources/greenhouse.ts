import { CrawledJob, CrawlSourceResult } from "../types";
import { GREENHOUSE_COMPANIES } from "../config";
import { isDrcJob } from "../drc-filter";

export async function fetchGreenhouseJobs(keyword?: string): Promise<{ jobs: CrawledJob[]; result: CrawlSourceResult }> {
  let totalFetched = 0;
  const matchedJobs: CrawledJob[] = [];
  const kw = keyword?.trim().toLowerCase();

  for (const companyConfig of GREENHOUSE_COMPANIES) {
    try {
      const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(companyConfig.boardToken)}/jobs?content=true`;
      const res = await fetch(url);
      if (!res.ok) {
        continue;
      }

      const data = await res.json();
      const rawList = data.jobs || [];
      totalFetched += rawList.length;

      for (const raw of rawList) {
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
          const parts = locName.split(",").map((s: string) => s.trim());
          if (parts.length > 1) {
            city = parts[0];
            country = parts[parts.length - 1];
          } else {
            city = locName;
          }
        }

        const candidate: CrawledJob = {
          source: "greenhouse",
          externalId: String(raw.id),
          title: raw.title?.trim() || "Untitled Position",
          company: companyConfig.companyName || "Greenhouse Company",
          url: raw.absolute_url,
          description: cleanDescription,
          postedAt: raw.updated_at ? new Date(raw.updated_at) : new Date(),
          city,
          country,
          workplaceType,
          remoteRegions: isRemote ? ["Worldwide"] : undefined,
        };

        if (isDrcJob(candidate)) {
          if (
            !kw ||
            candidate.title.toLowerCase().includes(kw) ||
            candidate.company.toLowerCase().includes(kw) ||
            candidate.description?.toLowerCase().includes(kw)
          ) {
            matchedJobs.push(candidate);
          }
        }
      }
    } catch {
      // Continue next company even if one company fails
      continue;
    }
  }

  return {
    jobs: matchedJobs,
    result: {
      source: "greenhouse",
      fetched: totalFetched,
      matched: matchedJobs.length,
      upserted: 0,
    },
  };
}
