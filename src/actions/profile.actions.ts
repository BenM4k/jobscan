"use server";

import { requireSession } from "@/lib/auth-guard";
import * as profileService from "@/services/profile.service";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { formatProfileDateRange } from "@/lib/date-format";

const updateProfileSchema = z.object({
  resumeText: z.string().min(10, "Resume text must be at least 10 characters"),
  skills: z.array(z.string()).optional(),
  aiProvider: z.enum(["claude", "gemini", "openai", "gateway"]).optional(),
});

export async function saveProfileTextAction(formData: FormData) {
  const sessionResult = await requireSession();
  if (!sessionResult.ok || !sessionResult.value) return { success: false, error: sessionResult.ok ? "Unauthorized" : sessionResult.error.message };

  const resumeText = (formData.get("resumeText") as string) || "";
  const skillsRaw = (formData.get("skills") as string) || "";
  const aiProvider = (formData.get("aiProvider") as string) || "gemini";

  const skills = skillsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const parsed = updateProfileSchema.safeParse({ resumeText, skills, aiProvider });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const userId = sessionResult.value.user.id;

  // Automatically format profile text with Gemini to extract short summary and work experience
  const reformatResult = await profileService.reformatProfileWithGemini(userId, parsed.data.resumeText);
  if (!reformatResult.ok) {
    // Fallback to updating details directly if Gemini is unavailable
    const result = await profileService.updateProfileDetails(userId, parsed.data);
    if (!result.ok) {
      return { success: false, error: result.error.message };
    }
    revalidatePath("/dashboard/profile");
    return { success: true, data: result.value };
  }

  revalidatePath("/dashboard/profile");
  return { success: true, data: reformatResult.value };
}

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
  
  // Format readable text if not provided
  let formattedResume = validData.resumeText || "";
  if (!formattedResume) {
    const summaryBlock = validData.summary ? `## Professional Summary\n${validData.summary}` : "";
    const skillsBlock = validData.skills?.length ? `## Core Skills\n${validData.skills.join(", ")}` : "";
    const expBlock = validData.experience?.length
      ? `## Work Experience\n\n` +
        validData.experience
          .map((exp) => {
            const dateRange = formatProfileDateRange(exp.startDate, exp.endDate);
            return `### ${exp.title} — ${exp.company}${dateRange ? ` (${dateRange})` : ""}\n` +
              exp.bullets.map((b) => `• ${b}`).join("\n");
          })
          .join("\n\n")
      : "";
    const eduBlock = validData.education?.length
      ? `## Education\n\n` +
        validData.education
          .map((edu) => {
            const dateRange = formatProfileDateRange(edu.startDate, edu.endDate);
            return `• ${edu.degree}${edu.field ? ` in ${edu.field}` : ""} — ${edu.institution}${dateRange ? ` (${dateRange})` : ""}`;
          })
          .join("\n")
      : "";

    formattedResume = [summaryBlock, skillsBlock, expBlock, eduBlock].filter(Boolean).join("\n\n");
  }

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
  return { success: true, data: result.value };
}

export async function uploadResumeFileAction(formData: FormData) {
  const sessionResult = await requireSession();
  if (!sessionResult.ok || !sessionResult.value) return { success: false, error: sessionResult.ok ? "Unauthorized" : sessionResult.error.message };

  const file = formData.get("file") as File | null;
  if (!file) {
    return { success: false, error: "No file provided" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const parseResult = await profileService.parseResumeFile(buffer, file.type);
  if (!parseResult.ok) {
    return { success: false, error: parseResult.error.message };
  }

  const userId = sessionResult.value.user.id;

  // Automatically use Gemini to reformat resume and extract profile skills data
  const reformatResult = await profileService.reformatProfileWithGemini(userId, parseResult.value);
  if (!reformatResult.ok) {
    // Fallback: save raw text if Gemini formatting fails
    const fallbackResult = await profileService.updateProfileDetails(userId, {
      resumeText: parseResult.value,
    });
    if (!fallbackResult.ok) return { success: false, error: fallbackResult.error.message };
    revalidatePath("/dashboard/profile");
    return { success: true, data: fallbackResult.value };
  }

  revalidatePath("/dashboard/profile");
  return { success: true, data: reformatResult.value };
}

export async function reformatProfileWithGeminiAction() {
  const sessionResult = await requireSession();
  if (!sessionResult.ok || !sessionResult.value) return { success: false, error: sessionResult.ok ? "Unauthorized" : sessionResult.error.message };

  const userId = sessionResult.value.user.id;
  const result = await profileService.reformatProfileWithGemini(userId);
  if (!result.ok) {
    return { success: false, error: result.error.message };
  }

  revalidatePath("/dashboard/profile");
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
