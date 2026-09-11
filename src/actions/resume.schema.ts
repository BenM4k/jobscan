import { z } from "zod";

export const createMasterResumeSchema = z.object({
  label: z.string().min(1, "Label is required").max(60),
  content: z.string().min(10, "Resume content must be at least 10 characters"),
  language: z.enum(["en", "fr"]).default("en"),
  fileUrl: z.string().url().optional(),
});

export const updateMasterResumeSchema = z.object({
  id: z.string().uuid("Invalid resume ID"),
  label: z.string().min(1).max(60).optional(),
  content: z.string().min(10).optional(),
  language: z.enum(["en", "fr"]).optional(),
});

export const promoteTailoredResumeSchema = z.object({
  tailoredResumeId: z.string().uuid("Invalid tailored resume ID"),
  label: z.string().min(1, "Persona label is required").max(60),
});

export const revertActiveResumeSchema = z.object({
  previousActiveId: z.string().uuid("Invalid previous resume ID"),
});

export const deleteMasterResumeSchema = z.object({
  resumeId: z.string().uuid("Invalid resume ID"),
});
