"use server";

import { requireSession } from "@/lib/auth-guard";
import * as profileService from "@/services/profile.service";
import { z } from "zod";

const updateProfileSchema = z.object({
  resumeText: z.string().min(10, "Resume text must be at least 10 characters"),
  skills: z.array(z.string()).optional(),
  aiProvider: z.enum(["claude", "gemini", "openai"]).optional(),
});

export async function saveProfileTextAction(formData: FormData) {
  const sessionResult = await requireSession();
  if (!sessionResult.ok) return { success: false, error: sessionResult.error.message };

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

  // Automatically format profile text with Gemini to extract short summary and work experience
  const reformatResult = await profileService.reformatProfileWithGemini(parsed.data.resumeText);
  if (!reformatResult.ok) {
    // Fallback to updating details directly if Gemini is unavailable
    const result = await profileService.updateProfileDetails(parsed.data);
    if (!result.ok) {
      return { success: false, error: result.error.message };
    }
    return { success: true, data: result.value };
  }

  return { success: true, data: reformatResult.value };
}

export async function uploadResumeFileAction(formData: FormData) {
  const sessionResult = await requireSession();
  if (!sessionResult.ok) return { success: false, error: sessionResult.error.message };

  const file = formData.get("file") as File | null;
  if (!file) {
    return { success: false, error: "No file provided" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const parseResult = await profileService.parseResumeFile(buffer, file.type);
  if (!parseResult.ok) {
    return { success: false, error: parseResult.error.message };
  }

  // Automatically use Gemini to reformat resume and extract profile skills data
  const reformatResult = await profileService.reformatProfileWithGemini(parseResult.value);
  if (!reformatResult.ok) {
    // Fallback: save raw text if Gemini formatting fails
    const fallbackResult = await profileService.updateProfileDetails({
      resumeText: parseResult.value,
    });
    if (!fallbackResult.ok) return { success: false, error: fallbackResult.error.message };
    return { success: true, data: fallbackResult.value };
  }

  return { success: true, data: reformatResult.value };
}

export async function reformatProfileWithGeminiAction() {
  const sessionResult = await requireSession();
  if (!sessionResult.ok) return { success: false, error: sessionResult.error.message };

  const result = await profileService.reformatProfileWithGemini();
  if (!result.ok) {
    return { success: false, error: result.error.message };
  }

  return { success: true, data: result.value };
}

export async function deleteResumeAction() {
  const sessionResult = await requireSession();
  if (!sessionResult.ok) return { success: false, error: sessionResult.error.message };

  const result = await profileService.updateProfileDetails({
    resumeText: "",
    skills: [],
  });

  if (!result.ok) {
    return { success: false, error: result.error.message };
  }

  return { success: true, data: result.value };
}
