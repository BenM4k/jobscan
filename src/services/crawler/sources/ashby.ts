import { CrawledJob, CrawlSourceResult } from "../types";
import { ASHBY_COMPANIES } from "../config";
import { isDrcJob } from "../drc-filter";

export async function fetchAshbyJobs(keyword?: string): Promise<{ jobs: CrawledJob[]; result: CrawlSourceResult }> {
  let totalFetched = 0;
  const matchedJobs: CrawledJob[] = [];
  const kw = keyword?.trim().toLowerCase();

  for (const companyConfig of ASHBY_COMPANIES) {
    try {
      const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(companyConfig.boardToken)}`;
      const res = await fetch(url);
      if (!res.ok) {
        continue;
      }

      const data = await res.json();
      const rawList = data.jobs || [];
      totalFetched += rawList.length;

      for (const raw of rawList) {
        const isRemote = raw.isRemote || (raw.locationName ? /remote/i.test(raw.locationName) : false) || /remote/i.test(raw.title);
        const workplaceType = isRemote ? "remote" : raw.locationName ? "on-site" : undefined;
        const city = raw.address?.postalAddress?.addressLocality || (raw.locationName && !/remote/i.test(raw.locationName) ? raw.locationName.split(",")[0]?.trim() : undefined);
        const country = raw.address?.postalAddress?.addressCountry || (raw.locationName && raw.locationName.includes(",") ? raw.locationName.split(",").pop()?.trim() : undefined);

        const candidate: CrawledJob = {
          source: "ashby",
          externalId: raw.id,
          title: raw.title,
          company: companyConfig.companyName || "Ashby Board",
          url: raw.jobUrl,
          description: raw.descriptionHtml || "",
          postedAt: raw.publishedAt ? new Date(raw.publishedAt) : new Date(),
          city,
          country,
          workplaceType,
          remoteRegions: isRemote ? ["Worldwide"] : undefined,
        };

        if (isDrcJob(candidate)) {
          if (!kw || candidate.title.toLowerCase().includes(kw) || candidate.description?.toLowerCase().includes(kw)) {
            matchedJobs.push(candidate);
          }
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
