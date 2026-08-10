import { inngest } from "./client";
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
    const provider = event.data.provider as string | undefined;

    await step.run("score-job", async () => {
      const res = await scoreJobWithAI(jobId, provider);
      if (!res.ok) {
        throw new Error(`Failed scoring job ${jobId}: ${res.error.message}`);
      }
      return res.value;
    });
  },
);
