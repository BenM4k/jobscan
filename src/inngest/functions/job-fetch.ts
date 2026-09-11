import { inngest } from "../client";
import { jobFetchRequestedEvent } from "../events";
import { fetchAndUpsertJobs } from "@/services/job.service";
import { runDrcCrawler } from "@/services/crawler/run";

export const ALL_JOB_SOURCES = [
  "greenhouse",
  "remoteok",
  "lever",
  "ashby",
  "congojob",
  "emploi_cd",
  "fecrdc",
  "unjobs",
] as const;

export type SupportedSourceId = (typeof ALL_JOB_SOURCES)[number];

/**
 * Daily Inngest cron to ingest all 8 job sources.
 * Scheduled daily at 00:00 UTC ("0 0 * * *").
 * Each source runs inside its own step.run() so a single source failure
 * does not abort or re-run already-completed sources on retry.
 */
export const ingestAllSources = inngest.createFunction(
  {
    id: "ingest-all-sources",
    triggers: [{ cron: "0 0 * * *" }], // Daily at midnight UTC
  },
  async ({ step }) => {
    const results: Array<{ source: string; success: boolean; error?: string }> = [];

    // Loop through all 8 sources, each as an independent step.run()
    for (const source of ALL_JOB_SOURCES) {
      const stepRes = await step.run(`ingest-${source}`, async () => {
        const res = await fetchAndUpsertJobs(source);
        if (!res.ok) {
          console.warn(
            `[Inngest Daily Cron] Failed ingesting ${source}: ${res.error.message}`
          );
          return { source, success: false, error: res.error.message };
        }
        return { success: true, ...res.value };
      });
      results.push(stepRes);
    }

    return {
      success: results.some((r) => r.success),
      totalSources: ALL_JOB_SOURCES.length,
      results,
    };
  }
);

/**
 * Backward-compatible alias for existing imports expecting scheduledJobFetch.
 */
export const scheduledJobFetch = ingestAllSources;

/**
 * On-demand background job fetch requested via Inngest event (job.fetch.requested).
 */
export const jobFetchRequested = inngest.createFunction(
  {
    id: "job-fetch-requested",
    triggers: [jobFetchRequestedEvent],
    debounce: {
      key: "event.data.userId || 'global'",
      period: "10m",
    },
  },
  async ({ event, step }) => {
    const { source = "all", target, userId } = event.data;

    if (source === "drc") {
      return await step.run("fetch-drc", async () => {
        const crawlResult = await runDrcCrawler(target, userId, { drcOnly: true });
        return {
          success: crawlResult.success,
          totalUpserted: crawlResult.totalUpserted,
        };
      });
    }

    if (source === "all") {
      const results: Array<{
        source: string;
        success: boolean;
        fetched?: number;
        upserted?: number;
        failed?: number;
        skipped?: boolean;
        reason?: string;
        error?: string;
      }> = [];
      let totalUpserted = 0;
      let totalFetched = 0;
      let totalFailed = 0;

      for (const s of ALL_JOB_SOURCES) {
        const stepRes = await step.run(`fetch-${s}`, async () => {
          const res = await fetchAndUpsertJobs(s, target, userId);
          if (!res.ok) {
            console.warn(`[Inngest On-Demand] Fetch failed for ${s}:`, res.error);
            return {
              source: s,
              success: false,
              fetched: 0,
              upserted: 0,
              failed: 0,
              skipped: true,
              reason: "fetch_failed",
              error: res.error.message,
            };
          }
          return { success: true, ...res.value };
        });
        results.push(stepRes);
        totalUpserted += stepRes.upserted || 0;
        totalFetched += stepRes.fetched || 0;
        totalFailed += stepRes.failed || 0;
      }

      return {
        success: results.some((r) => r.success),
        totalUpserted,
        totalFetched,
        totalFailed,
        totalSources: ALL_JOB_SOURCES.length,
        results,
      };
    }

    // Single source
    return await step.run(`fetch-${source}`, async () => {
      const res = await fetchAndUpsertJobs(source, target, userId);
      if (!res.ok) {
        throw new Error(`Failed fetching ${source}: ${res.error.message}`);
      }
      return res.value;
    });
  }
);
