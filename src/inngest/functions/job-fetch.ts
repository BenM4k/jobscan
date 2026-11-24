import { inngest } from "../client";
import { drcJobFetchRequestedEvent, jobFetchRequestedEvent } from "../events";
import { fetchAndUpsertJobs } from "@/services/job.service";

export const ALL_JOB_SOURCES = [
  "greenhouse",
  "remoteok",
  "lever",
  "ashby",
  "congojob",
  "emploi_cd",
  "fecrdc",
  "unjobs",
  "reliefweb",
] as const;

export const DRC_JOB_SOURCES = [
  "reliefweb",
  "emploi_cd",
  "congojob",
  "unjobs",
  "fecrdc",
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
    const results: Array<{ source: string; success: boolean; error?: string }> =
      [];

    // Loop through all 8 sources, each as an independent step.run()
    for (const source of ALL_JOB_SOURCES) {
      const stepRes = await step.run(`ingest-${source}`, async () => {
        const res = await fetchAndUpsertJobs(source);
        if (!res.ok) {
          console.warn(
            `[Inngest Daily Cron] Failed ingesting ${source}: ${res.error.message}`,
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
  },
);

/**
 * Backward-compatible alias for existing imports expecting scheduledJobFetch.
 */
export const scheduledJobFetch = ingestAllSources;

interface DrcSourceStepResult {
  source: string;
  success: boolean;
  fetched?: number;
  upserted?: number;
  failed?: number;
  skipped?: boolean;
  reason?: string;
  message?: string;
  error?: string;
}

async function runDrcSourcesFetch(
  step: {
    run: (
      id: string,
      fn: () => Promise<DrcSourceStepResult>,
    ) => Promise<DrcSourceStepResult>;
  },
  keyword?: string,
  userId?: string,
) {
  let totalUpserted = 0;
  let totalFetched = 0;
  let totalFailed = 0;
  const results: DrcSourceStepResult[] = [];

  for (const s of DRC_JOB_SOURCES) {
    const stepRes = await step.run(`fetch-drc-${s}`, async () => {
      const res = await fetchAndUpsertJobs(s, undefined, userId, keyword);
      if (!res.ok) {
        return {
          source: s,
          success: false,
          fetched: 0,
          upserted: 0,
          failed: 0,
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
    results,
  };
}

/**
 * Interactive DRC job fetch requested via Inngest event (job.drc.fetch.requested).
 * Kept un-debounced so distinct user searches start immediately without a 10m cooldown.
 */
export const drcJobFetchRequested = inngest.createFunction(
  {
    id: "drc-job-fetch-requested",
    triggers: [drcJobFetchRequestedEvent],
  },
  async ({ event, step }) => {
    const { keyword, userId } = event.data;
    return await runDrcSourcesFetch(step, keyword, userId);
  },
);

/**
 * On-demand background job fetch requested via Inngest event (job.fetch.requested).
 */
export const jobFetchRequested = inngest.createFunction(
  {
    id: "job-fetch-requested",
    triggers: [jobFetchRequestedEvent],
    debounce: {
      key: "has(event.data.userId) && event.data.userId != '' ? event.data.userId : 'global'",
      period: "10m",
    },
  },
  async ({ event, step }) => {
    const { source = "all", target, userId } = event.data;

    if (source === "drc") {
      return await runDrcSourcesFetch(step, target, userId);
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
            console.warn(
              `[Inngest On-Demand] Fetch failed for ${s}:`,
              res.error,
            );
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
  },
);
