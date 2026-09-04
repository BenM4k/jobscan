import { CrawlResult, CrawlSourceResult } from "./types";
import { fetchReliefWebJobs } from "./sources/reliefweb";
import { fetchRemoteOKJobs } from "./sources/remoteok";
import { fetchGreenhouseJobs } from "./sources/greenhouse";
import { fetchLeverJobs } from "./sources/lever";
import { fetchAshbyJobs } from "./sources/ashby";
import { fetchEmploiCdJobs } from "./sources/emploicd";
import { fetchCongoJobJobs } from "./sources/congojob";
import { fetchUnJobsJobs } from "./sources/unjobs";
import { fetchFecRdcJobs } from "./sources/fecrdc";
import {
  resolveCrawlerKeyword,
  ingestCrawledJob,
} from "./crawler-utils";

const SOURCE_FETCHERS = [
  { name: "reliefweb", fetcher: fetchReliefWebJobs },
  { name: "remoteok", fetcher: fetchRemoteOKJobs },
  { name: "greenhouse", fetcher: fetchGreenhouseJobs },
  { name: "lever", fetcher: fetchLeverJobs },
  { name: "ashby", fetcher: fetchAshbyJobs },
  { name: "emploicd", fetcher: fetchEmploiCdJobs },
  { name: "congojob", fetcher: fetchCongoJobJobs },
  { name: "unjobs", fetcher: fetchUnJobsJobs },
  { name: "fecrdc", fetcher: fetchFecRdcJobs },
];

export async function runDrcCrawler(
  keyword?: string,
  userId?: string,
): Promise<CrawlResult> {
  const startTime = Date.now();
  const targetKeyword = await resolveCrawlerKeyword(keyword, userId);

  const sourceResults: CrawlSourceResult[] = [];
  let totalUpserted = 0;
  const filterKw = targetKeyword?.toLowerCase();

  for (const { name, fetcher } of SOURCE_FETCHERS) {
    try {
      const { result, jobs: rawJobs } = await fetcher(targetKeyword);
      const jobs = filterKw
        ? rawJobs.filter(
            (j) =>
              j.title.toLowerCase().includes(filterKw) ||
              Boolean(j.description?.toLowerCase().includes(filterKw)) ||
              j.company.toLowerCase().includes(filterKw),
          )
        : rawJobs;

      let sourceUpserted = 0;
      for (const job of jobs) {
        const success = await ingestCrawledJob(job, userId, name);
        if (success) {
          sourceUpserted++;
        }
      }

      result.upserted = sourceUpserted;
      totalUpserted += sourceUpserted;
      sourceResults.push(result);
    } catch (err: unknown) {
      sourceResults.push({
        source: name,
        fetched: 0,
        matched: 0,
        upserted: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    success: true,
    totalUpserted,
    sources: sourceResults,
    durationMs: Date.now() - startTime,
  };
}
