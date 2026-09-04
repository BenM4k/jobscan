import { CrawledJob, CrawlSourceResult } from "../types";
import { GREENHOUSE_COMPANIES } from "../config";
import { isEligibleCandidate, parseLocationFromText } from "../crawler-utils";

function parseGreenhouseJob(raw: Record<string, unknown>, companyName: string): CrawledJob {
  const content = typeof raw.content === "string" ? raw.content : "No description provided.";
  const cleanDescription = content
    .replace(/<[^>]*>?/gm, "")
    .replace(/\s+/g, " ")
    .trim();

  const locationObj = raw.location as Record<string, string> | undefined;
  const locName = locationObj?.name?.trim();
  const titleStr = typeof raw.title === "string" ? raw.title.trim() : "Untitled Position";

  const isRemote = locName
    ? /remote/i.test(locName) || /remote/i.test(titleStr)
    : /remote/i.test(titleStr);
  const workplaceType = isRemote ? "remote" : locName ? "on-site" : undefined;

  const loc = parseLocationFromText(locName);

  return {
    source: "greenhouse",
    externalId: String(raw.id || ""),
    title: titleStr,
    company: companyName,
    url: String(raw.absolute_url || ""),
    description: cleanDescription,
    postedAt: raw.updated_at ? new Date(String(raw.updated_at)) : new Date(),
    city: loc.city,
    country: loc.country,
    workplaceType,
    remoteRegions: isRemote ? ["Worldwide"] : undefined,
  };
}

export async function fetchGreenhouseJobs(
  keyword?: string
): Promise<{ jobs: CrawledJob[]; result: CrawlSourceResult }> {
  let totalFetched = 0;
  const matchedJobs: CrawledJob[] = [];

  for (const company of GREENHOUSE_COMPANIES) {
    try {
      const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(company.boardToken)}/jobs?content=true`;
      const res = await fetch(url);
      if (!res.ok) continue;

      const data = await res.json();
      const rawList = Array.isArray(data.jobs) ? data.jobs : [];
      totalFetched += rawList.length;

      for (const raw of rawList) {
        const candidate = parseGreenhouseJob(raw, company.companyName || "Greenhouse Company");
        if (isEligibleCandidate(candidate, keyword)) {
          matchedJobs.push(candidate);
        }
      }
    } catch {
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
