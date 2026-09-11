import { z } from "zod";

export const scoreJobSchema = z.object({
  jobId: z.uuid(),
  provider: z.enum(["claude", "gemini", "openai", "gateway"]).optional(),
  idempotencyKey: z.uuid({
    message: "A valid UUID idempotencyKey is required for scoring",
  }),
  resumeId: z.uuid().optional(),
});

export const tailoredResumeActionSchema = z.object({
  jobId: z.uuid(),
  idempotencyKey: z.uuid({
    message: "A valid UUID idempotencyKey is required",
  }),
  resumeId: z.uuid().optional(),
});

export const tailoredCoverLetterActionSchema = z.object({
  jobId: z.uuid(),
  idempotencyKey: z.uuid({
    message: "A valid UUID idempotencyKey is required",
  }),
  resumeId: z.uuid().optional(),
  regenerate: z.boolean().optional(),
  instructions: z.string().optional(),
  tone: z.string().optional(),
});
