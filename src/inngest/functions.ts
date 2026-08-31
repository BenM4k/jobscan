import { inngest } from "./client";
import { NonRetriableError } from "inngest";
import { fetchAndUpsertJobs, scoreJobWithAI } from "@/services/job.service";

export const scheduledJobFetch = inngest.createFunction(
  {
    id: "scheduled-job-fetch",
    triggers: [{ cron: "0 9 * * *" }],
  },
  async ({ step }) => {
    const sources: Array<"greenhouse" | "remoteok" | "lever" | "ashby"> = [
      "greenhouse",
      "remoteok",
      "lever",
      "ashby",
    ];

    for (const source of sources) {
      await step.run(`fetch-${source}`, async () => {
        const res = await fetchAndUpsertJobs(source);
        if (!res.ok) {
          throw new Error(`Failed fetching ${source}: ${res.error.message}`);
        }
        return res.value;
      });
    }
  },
);

export const scoreJobOnCreation = inngest.createFunction(
  {
    id: "score-job-created",
    triggers: [{ event: "job.created" }],
  },
  async ({ event, step }) => {
    const jobId = event.data.jobId as string;
    const userId = event.data.userId as string;
    const provider = event.data.provider as string | undefined;

    // Validate required identifiers before any DB access. Missing or empty
    // values indicate a malformed event — retrying would never succeed.
    if (typeof userId !== "string" || !userId.trim()) {
      throw new NonRetriableError(
        `scoreJobOnCreation: event.data.userId is absent or invalid (jobId=${jobId}). Event will not be retried.`
      );
    }
    if (typeof jobId !== "string" || !jobId.trim()) {
      throw new NonRetriableError(
        `scoreJobOnCreation: event.data.jobId is absent or invalid. Event will not be retried.`
      );
    }

    await step.run("score-job", async () => {
      const res = await scoreJobWithAI(jobId, userId, provider);
      if (!res.ok) {
        throw new Error(`Failed scoring job ${jobId}: ${res.error.message}`);
      }
      return res.value;
    });
  },
);
