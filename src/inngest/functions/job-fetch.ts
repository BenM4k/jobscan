import { inngest } from "../client";
import { jobFetchRequestedEvent } from "../events";
import { fetchAndUpsertJobs } from "@/services/job.service";
import { runDrcCrawler } from "@/services/crawler/run";

const ATS_SOURCES: Array<"greenhouse" | "remoteok" | "lever" | "ashby"> = [
  "greenhouse",
  "remoteok",
  "lever",
  "ashby",
];

export const scheduledJobFetch = inngest.createFunction(
  {
    id: "scheduled-job-fetch",
    triggers: [{ cron: "0 */6 * * *" }],
  },
  async ({ step }) => {
    // 1. Poll ATS job sources
    for (const source of ATS_SOURCES) {
      await step.run(`poll-ats-${source}`, async () => {
        const res = await fetchAndUpsertJobs(source);
        if (!res.ok) {
          console.warn(`[Inngest Cron] Failed polling ${source}: ${res.error.message}`);
          return { source, success: false, error: res.error.message };
        }
        return { source, success: true, ...res.value };
      });
    }

    // 2. Poll DRC local job boards
    await step.run("poll-drc-crawler", async () => {
      const crawlResult = await runDrcCrawler(undefined, undefined, { drcOnly: true });
      return {
        success: crawlResult.success,
        totalUpserted: crawlResult.totalUpserted,
        sources: crawlResult.sources,
      };
    });
  }
);

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
      for (const atsSource of ATS_SOURCES) {
        await step.run(`fetch-ats-${atsSource}`, async () => {
          const res = await fetchAndUpsertJobs(atsSource, target, userId);
          if (!res.ok) {
            console.warn(`[Inngest On-Demand] Fetch failed for ${atsSource}:`, res.error);
            return { source: atsSource, success: false, error: res.error.message };
          }
          return { source: atsSource, success: true, ...res.value };
        });
      }

      return await step.run("fetch-drc-crawler", async () => {
        const crawlResult = await runDrcCrawler(target, userId, { drcOnly: true });
        return {
          success: crawlResult.success,
          totalUpserted: crawlResult.totalUpserted,
        };
      });
    }

    // Single ATS source
    return await step.run(`fetch-${source}`, async () => {
      const res = await fetchAndUpsertJobs(
        source as "greenhouse" | "remoteok" | "lever" | "ashby",
        target,
        userId
      );
      if (!res.ok) {
        throw new Error(`Failed fetching ${source}: ${res.error.message}`);
      }
      return res.value;
    });
  }
);
