"use server";

import { requireSession } from "@/lib/auth-guard";
import * as profileService from "@/services/profile.service";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { formatResumeToMarkdown } from "@/lib/resume-format";



const educationItemSchema = z.object({
  institution: z.string(),
  degree: z.string(),
  field: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const experienceItemSchema = z.object({
  company: z.string(),
  title: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  bullets: z.array(z.string()).default([]),
});

const saveMasterResumeSchema = z.object({
  summary: z.string().default(""),
  skills: z.array(z.string()).default([]),
  education: z.array(educationItemSchema).optional().default([]),
  experience: z.array(experienceItemSchema).optional().default([]),
  rawText: z.string().optional(),
  resumeText: z.string().optional(),
  aiProvider: z.string().optional(),
});

export async function saveMasterResumeAction(data: {
  summary: string;
  skills: string[];
  education?: Array<{ institution: string; degree: string; field?: string; startDate?: string; endDate?: string }>;
  experience?: Array<{ company: string; title: string; startDate?: string; endDate?: string; bullets: string[] }>;
  rawText?: string;
  resumeText?: string;
  aiProvider?: string;
}) {
  const sessionResult = await requireSession();
  if (!sessionResult.ok || !sessionResult.value) return { success: false, error: sessionResult.ok ? "Unauthorized" : sessionResult.error.message };

  const parsed = saveMasterResumeSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Invalid resume data",
    };
  }

  const validData = parsed.data;
  const profileDal = await import("@/dal/profile.dal");
  
  // Format readable text from structured fields if provided, otherwise fallback to resumeText or rawText
  const hasStructuredFields = Boolean(
    validData.summary?.trim() ||
    (validData.skills && validData.skills.length > 0) ||
    (validData.experience && validData.experience.length > 0) ||
    (validData.education && validData.education.length > 0)
  );

  const formattedResume = hasStructuredFields
    ? formatResumeToMarkdown({
        summary: validData.summary,
        skills: validData.skills,
        education: validData.education,
        experience: validData.experience,
        rawResumeText: validData.rawText || validData.resumeText,
      })
    : validData.resumeText || validData.rawText || "";

  const userId = sessionResult.value.user.id;

  const result = await profileDal.upsertProfile(userId, {
    summary: validData.summary,
    skills: validData.skills,
    education: validData.education,
    experience: validData.experience,
    rawText: validData.rawText || formattedResume,
    resumeText: formattedResume,
    aiProvider: validData.aiProvider || "gemini",
  });

  if (!result.ok) {
    return { success: false, error: result.error.message };
  }

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/resumes");
  revalidatePath("/dashboard/jobs");
  revalidatePath("/dashboard");
  return { success: true, data: result.value };
}



export async function deleteResumeAction() {
  const sessionResult = await requireSession();
  if (!sessionResult.ok || !sessionResult.value) return { success: false, error: sessionResult.ok ? "Unauthorized" : sessionResult.error.message };

  const userId = sessionResult.value.user.id;
  const result = await profileService.updateProfileDetails(userId, {
    resumeText: "",
    skills: [],
  });

  if (!result.ok) {
    return { success: false, error: result.error.message };
  }

  revalidatePath("/dashboard/profile");
  return { success: true, data: result.value };
}
