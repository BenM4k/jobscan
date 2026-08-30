import { CrawledJob, CrawlSourceResult } from "../types";
import { LEVER_COMPANIES } from "../config";
import { isDrcJob } from "../drc-filter";

export async function fetchLeverJobs(keyword?: string): Promise<{ jobs: CrawledJob[]; result: CrawlSourceResult }> {
  let totalFetched = 0;
  const matchedJobs: CrawledJob[] = [];
  const kw = keyword?.trim().toLowerCase();

  for (const companyConfig of LEVER_COMPANIES) {
    try {
      const url = `https://api.lever.co/v0/postings/${encodeURIComponent(companyConfig.boardToken)}?mode=json`;
      const res = await fetch(url);
      if (!res.ok) {
        continue;
      }

      const data = await res.json();
      const rawList = Array.isArray(data) ? data : [];
      totalFetched += rawList.length;

      for (const raw of rawList) {
        const locName = raw.categories?.location;
        const leverWp = raw.categories?.workplaceType?.toLowerCase();
        const isRemote = leverWp === "remote" || (locName ? /remote/i.test(locName) : false) || /remote/i.test(raw.text);
        const workplaceType: "remote" | "on-site" | "hybrid" | undefined = isRemote
          ? "remote"
          : leverWp === "hybrid"
          ? "hybrid"
          : leverWp === "onsite" || leverWp === "on-site" || locName
          ? "on-site"
          : undefined;

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
          source: "lever",
          externalId: raw.id,
          title: raw.text,
          company: companyConfig.companyName || "Lever Posting",
          url: raw.hostedUrl,
          description: raw.descriptionPlain || "",
          postedAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
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
