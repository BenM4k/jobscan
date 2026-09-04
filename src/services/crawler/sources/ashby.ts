import { CrawledJob, CrawlSourceResult } from "../types";
import { ASHBY_COMPANIES } from "../config";
import { isEligibleCandidate } from "../crawler-utils";

function parseAshbyJob(raw: Record<string, unknown>, companyName: string): CrawledJob {
  const address = raw.address as Record<string, unknown> | undefined;
  const postal = address?.postalAddress as Record<string, string> | undefined;
  const locationName = typeof raw.locationName === "string" ? raw.locationName : undefined;

  const isRemote =
    Boolean(raw.isRemote) ||
    (locationName ? /remote/i.test(locationName) : false) ||
    (typeof raw.title === "string" && /remote/i.test(raw.title));

  const workplaceType = isRemote ? "remote" : locationName ? "on-site" : undefined;
  const city =
    postal?.addressLocality ||
    (locationName && !/remote/i.test(locationName)
      ? locationName.split(",")[0]?.trim()
      : undefined);
  const country =
    postal?.addressCountry ||
    (locationName && locationName.includes(",")
      ? locationName.split(",").pop()?.trim()
      : undefined);

  return {
    source: "ashby",
    externalId: String(raw.id || ""),
    title: String(raw.title || ""),
    company: companyName,
    url: String(raw.jobUrl || ""),
    description: String(raw.descriptionHtml || ""),
    postedAt: raw.publishedAt ? new Date(String(raw.publishedAt)) : new Date(),
    city,
    country,
    workplaceType,
    remoteRegions: isRemote ? ["Worldwide"] : undefined,
  };
}

export async function fetchAshbyJobs(
  keyword?: string
): Promise<{ jobs: CrawledJob[]; result: CrawlSourceResult }> {
  let totalFetched = 0;
  const matchedJobs: CrawledJob[] = [];

  for (const company of ASHBY_COMPANIES) {
    try {
      const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(company.boardToken)}`;
      const res = await fetch(url);
      if (!res.ok) continue;

      const data = await res.json();
      const rawList = Array.isArray(data.jobs) ? data.jobs : [];
      totalFetched += rawList.length;

      for (const raw of rawList) {
        const candidate = parseAshbyJob(raw, company.companyName || "Ashby Board");
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
      source: "ashby",
      fetched: totalFetched,
      matched: matchedJobs.length,
      upserted: 0,
    },
  };
}
