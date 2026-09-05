import { CrawlResult, CrawlSourceResult, CrawledJob } from "./types";
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
import { getCircuitBreaker } from "@/lib/circuit-breaker";

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

async function ingestJobsConcurrently(
  jobs: CrawledJob[],
  userId?: string,
  sourceName?: string,
  concurrency = 8,
): Promise<number> {
  let upsertedCount = 0;
  const executing = new Set<Promise<void>>();

  for (const job of jobs) {
    const p: Promise<void> = (async () => {
      try {
        const success = await ingestCrawledJob(job, userId, sourceName);
        if (success) {
          upsertedCount++;
        }
      } catch (jobErr) {
        console.error(
          `[Crawler ${sourceName || "unknown"}] Failed to ingest job ${job?.externalId || "unknown"}:`,
          jobErr
        );
      }
    })().finally(() => executing.delete(p));

    executing.add(p);
    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return upsertedCount;
}

export async function runDrcCrawler(
  keyword?: string,
  userId?: string,
): Promise<CrawlResult> {
  const startTime = Date.now();
  const sourceResults: CrawlSourceResult[] = [];
  let totalUpserted = 0;

  try {
    const targetKeyword = await resolveCrawlerKeyword(keyword, userId);
    const filterKw = targetKeyword?.toLowerCase();

    const fetchSettled = await Promise.allSettled(
      SOURCE_FETCHERS.map(async ({ name, fetcher }) => {
        const breaker = getCircuitBreaker(name);
        return breaker.execute(async () => {
          const { result, jobs: rawJobs } = await fetcher(targetKeyword);
          return { name, result, rawJobs };
        });
      })
    );

    for (let i = 0; i < SOURCE_FETCHERS.length; i++) {
      const sourceDef = SOURCE_FETCHERS[i];
      const settled = fetchSettled[i];

      if (settled.status === "rejected") {
        sourceResults.push({
          source: sourceDef.name,
          fetched: 0,
          matched: 0,
          upserted: 0,
          error:
            settled.reason instanceof Error
              ? settled.reason.message
              : String(settled.reason),
        });
        continue;
      }

      try {
        const { name, result, rawJobs } = settled.value;
        const safeRawJobs = Array.isArray(rawJobs) ? rawJobs : [];
        const jobs = filterKw
          ? safeRawJobs.filter(
              (j) =>
                Boolean(j?.title?.toLowerCase().includes(filterKw)) ||
                Boolean(j?.description?.toLowerCase().includes(filterKw)) ||
                Boolean(j?.company?.toLowerCase().includes(filterKw)),
            )
          : safeRawJobs;

        const sourceUpserted = await ingestJobsConcurrently(jobs, userId, name, 8);
        const finalResult: CrawlSourceResult = result ?? {
          source: sourceDef.name,
          fetched: safeRawJobs.length,
          matched: jobs.length,
          upserted: 0,
        };
        finalResult.upserted = sourceUpserted;
        totalUpserted += sourceUpserted;
        sourceResults.push(finalResult);
      } catch (sourceErr: unknown) {
        const msg =
          sourceErr instanceof Error ? sourceErr.message : String(sourceErr);
        console.error(
          `[Crawler] Error ingesting source ${sourceDef.name}:`,
          sourceErr
        );
        sourceResults.push({
          source: sourceDef.name,
          fetched: 0,
          matched: 0,
          upserted: 0,
          error: msg,
        });
      }
    }

    const allFailed =
      sourceResults.length > 0 &&
      sourceResults.every((s) => Boolean(s.error));

    return {
      success: !allFailed,
      totalUpserted,
      sources: sourceResults,
      durationMs: Date.now() - startTime,
      ...(allFailed ? { error: "All crawl sources failed to fetch or parse." } : {}),
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to run DRC crawler";
    console.error("[Crawler] runDrcCrawler caught top-level error:", error);

    return {
      success: false,
      totalUpserted,
      sources: sourceResults,
      durationMs: Date.now() - startTime,
      error: message,
    };
  }
}
