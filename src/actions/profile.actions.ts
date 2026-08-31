"use server";

import { requireSession } from "@/lib/auth-guard";
import * as profileService from "@/services/profile.service";
import { z } from "zod";

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
    return { success: true, data: result.value };
  }

  return { success: true, data: reformatResult.value };
}

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

  const profileDal = await import("@/dal/profile.dal");
  
  // Format readable text if not provided
  let formattedResume = data.resumeText || "";
  if (!formattedResume) {
    const summaryBlock = data.summary ? `## Professional Summary\n${data.summary}` : "";
    const skillsBlock = data.skills?.length ? `## Core Skills\n${data.skills.join(", ")}` : "";
    const expBlock = data.experience?.length
      ? `## Work Experience\n\n` +
        data.experience
          .map(
            (exp) =>
              `### ${exp.title} — ${exp.company}${exp.startDate || exp.endDate ? ` (${[exp.startDate, exp.endDate].filter(Boolean).join(" - ")})` : ""}\n` +
              exp.bullets.map((b) => `• ${b}`).join("\n")
          )
          .join("\n\n")
      : "";
    const eduBlock = data.education?.length
      ? `## Education\n\n` +
        data.education
          .map(
            (edu) =>
              `• ${edu.degree}${edu.field ? ` in ${edu.field}` : ""} — ${edu.institution}${edu.startDate || edu.endDate ? ` (${[edu.startDate, edu.endDate].filter(Boolean).join(" - ")})` : ""}`
          )
          .join("\n")
      : "";

    formattedResume = [summaryBlock, skillsBlock, expBlock, eduBlock].filter(Boolean).join("\n\n");
  }

  const userId = sessionResult.value.user.id;

  const result = await profileDal.upsertProfile(userId, {
    summary: data.summary,
    skills: data.skills,
    education: data.education || [],
    experience: data.experience || [],
    rawText: data.rawText || formattedResume,
    resumeText: formattedResume,
    aiProvider: data.aiProvider || "gemini",
  });

  if (!result.ok) {
    return { success: false, error: result.error.message };
  }

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
    return { success: true, data: fallbackResult.value };
  }

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

  return { success: true, data: result.value };
}
