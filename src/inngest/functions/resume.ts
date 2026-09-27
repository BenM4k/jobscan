import { inngest } from "../client";
import { resumeUpdatedEvent } from "../events";
import { NonRetriableError } from "inngest";
import { embedResume } from "@/services/ai/embed";

export const embedResumeOnUpdate = inngest.createFunction(
  {
    id: "embed-resume-on-update",
    triggers: [resumeUpdatedEvent],
  },
  async ({ event, step }) => {
    const { resumeId, userId, content, expectedVersion } = event.data;

    // Validate required identifiers before generating embeddings
    if (!resumeId || typeof resumeId !== "string" || !resumeId.trim()) {
      throw new NonRetriableError(
        "embedResumeOnUpdate: event.data.resumeId is absent or invalid. Event will not be retried."
      );
    }
    if (!userId || typeof userId !== "string" || !userId.trim()) {
      throw new NonRetriableError(
        `embedResumeOnUpdate: event.data.userId is absent or invalid (resumeId=${resumeId}). Event will not be retried.`
      );
    }
    if (!content || typeof content !== "string" || !content.trim()) {
      throw new NonRetriableError(
        `embedResumeOnUpdate: event.data.content is empty or invalid (resumeId=${resumeId}). Event will not be retried.`
      );
    }

    await step.run("embed-resume", async () => {
      const res = await embedResume(resumeId, userId, content, expectedVersion);
      if (!res.ok) {
        throw new Error(
          `Failed embedding resume ${resumeId}: ${res.error.message}`
        );
      }
      return res.value;
    });
  }
);
