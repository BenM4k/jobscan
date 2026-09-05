import { inngest } from "../client";
import { jobCreatedEvent } from "../events";
import { NonRetriableError } from "inngest";
import { scoreJobWithAI } from "@/services/job.service";

export const scoreJobOnCreation = inngest.createFunction(
  {
    id: "score-job-created",
    triggers: [jobCreatedEvent],
  },
  async ({ event, step }) => {
    const { jobId, userId, provider } = event.data;

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
  }
);
