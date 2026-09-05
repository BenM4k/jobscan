import { eventType } from "inngest";
import { z } from "zod";

export const jobFetchRequestedEvent = eventType("job.fetch.requested", {
  schema: z.object({
    source: z
      .enum(["greenhouse", "remoteok", "lever", "ashby", "drc", "all"])
      .optional(),
    target: z.string().optional(),
    userId: z.string().optional(),
  }),
});

export const digestEmailScheduledEvent = eventType("digest.email.scheduled", {
  schema: z.object({
    userId: z.string(),
    frequency: z.enum(["daily", "weekly"]).optional(),
  }),
});

export const jobCreatedEvent = eventType("job.created", {
  schema: z.object({
    jobId: z.string(),
    userId: z.string(),
    provider: z.enum(["claude", "gemini", "openai", "gateway"]).optional(),
  }),
});

export type JobFetchRequestedInput = z.infer<
  typeof jobFetchRequestedEvent.schema
>;
export type DigestEmailScheduledInput = z.infer<
  typeof digestEmailScheduledEvent.schema
>;
export type JobCreatedInput = z.infer<typeof jobCreatedEvent.schema>;
