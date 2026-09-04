import { CrawledJob, CrawlSourceResult } from "../types";
import { LEVER_COMPANIES } from "../config";
import { isEligibleCandidate, parseLocationFromText } from "../crawler-utils";

function parseLeverJob(raw: Record<string, unknown>, companyName: string): CrawledJob {
  const categories = raw.categories as Record<string, string> | undefined;
  const locName = categories?.location;
  const leverWp = categories?.workplaceType?.toLowerCase();

  const titleStr = typeof raw.text === "string" ? raw.text : "";
  const isRemote =
    leverWp === "remote" ||
    (locName ? /remote/i.test(locName) : false) ||
    /remote/i.test(titleStr);

  const workplaceType: "remote" | "on-site" | "hybrid" | undefined = isRemote
    ? "remote"
    : leverWp === "hybrid"
    ? "hybrid"
    : leverWp === "onsite" || leverWp === "on-site" || locName
    ? "on-site"
    : undefined;

  const loc = parseLocationFromText(locName);

  return {
    source: "lever",
    externalId: String(raw.id || ""),
    title: titleStr,
    company: companyName,
    url: String(raw.hostedUrl || ""),
    description: String(raw.descriptionPlain || ""),
    postedAt: raw.createdAt ? new Date(Number(raw.createdAt)) : new Date(),
    city: loc.city,
    country: loc.country,
    workplaceType,
    remoteRegions: isRemote ? ["Worldwide"] : undefined,
  };
}

export async function fetchLeverJobs(
  keyword?: string
): Promise<{ jobs: CrawledJob[]; result: CrawlSourceResult }> {
  let totalFetched = 0;
  const matchedJobs: CrawledJob[] = [];

  for (const company of LEVER_COMPANIES) {
    try {
      const url = `https://api.lever.co/v0/postings/${encodeURIComponent(company.boardToken)}?mode=json`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;

      const data = await res.json();
      const rawList = Array.isArray(data) ? data : [];
      totalFetched += rawList.length;

      for (const raw of rawList) {
        const candidate = parseLeverJob(raw, company.companyName || "Lever Posting");
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
      source: "lever",
      fetched: totalFetched,
      matched: matchedJobs.length,
      upserted: 0,
    },
  };
}
