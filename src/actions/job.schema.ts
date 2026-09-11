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

/**
 * Shared field-level validation for custom cover letter prompt fields.
 */
export const coverLetterInstructionsSchema = z
  .string()
  .trim()
  .max(1000, "Instructions must be at most 1000 characters")
  .optional();

export const coverLetterToneSchema = z
  .string()
  .trim()
  .max(50, "Tone must be at most 50 characters")
  .optional();

export const coverLetterPromptFieldsSchema = z.object({
  instructions: coverLetterInstructionsSchema,
  tone: coverLetterToneSchema,
});

export const tailoredCoverLetterActionSchema = z.object({
  jobId: z.uuid(),
  idempotencyKey: z.uuid({
    message: "A valid UUID idempotencyKey is required",
  }),
  resumeId: z.uuid().optional(),
  regenerate: z.boolean().optional(),
  instructions: coverLetterInstructionsSchema,
  tone: coverLetterToneSchema,
});
