import "server-only";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";
import * as resumeDal from "./resume.dal";

import type { EducationItem, ExperienceItem } from "@/lib/ai";
import { parseResumeContent } from "@/lib/resume-format";

export interface ProfileSelect {
  id: string;
  userId: string;
  resumeText: string;
  rawText: string | null;
  summary: string | null;
  skills: string[];
  education: EducationItem[];
  experience: ExperienceItem[];
  aiProvider: string;
  updatedAt: Date;
}

export type ProfileInsert = Partial<Omit<ProfileSelect, "id" | "userId">> & {
  userId: string;
  resumeText: string;
};

export async function getProfile(
  userId: string
): Promise<Result<ProfileSelect | null, AppError>> {
  try {
    const activeRes = await resumeDal.getActiveMasterResume(userId);
    if (!activeRes.ok) {
      return err(activeRes.error);
    }

    const activeResume = activeRes.value;
    const activeContent = activeResume?.content?.trim() || "";

    if (!activeResume || !activeContent) {
      return ok(null);
    }

    let skills: string[] = [];
    const skillsRes = await resumeDal.getResumeSkills(activeResume.id);
    if (skillsRes.ok && skillsRes.value && skillsRes.value.length > 0) {
      skills = skillsRes.value;
    }

    const parsed = parseResumeContent(activeContent);
    if (skills.length === 0 && parsed.skills.length > 0) {
      skills = parsed.skills;
    }

    const synthesizedProfile: ProfileSelect = {
      id: activeResume.id,
      userId: activeResume.userId,
      resumeText: activeContent,
      rawText: activeResume.content,
      summary: parsed.summary || null,
      skills,
      education: parsed.education,
      experience: parsed.experience,
      aiProvider: "gemini",
      updatedAt: activeResume.updatedAt,
    };

    return ok(synthesizedProfile);
  } catch (error) {
    return err(new AppError("DB_ERROR", "Failed to fetch profile", error));
  }
}

export async function upsertProfile(
  userId: string,
  data: Partial<Omit<ProfileInsert, "id" | "userId">> & { resumeText: string }
): Promise<Result<ProfileSelect, AppError>> {
  try {
    const activeRes = await resumeDal.getActiveMasterResume(userId);
    if (!activeRes.ok) {
      return err(activeRes.error);
    }

    let savedResume: resumeDal.MasterResumeSelect;
    if (activeRes.value) {
      const updateRes = await resumeDal.updateMasterResume(
        activeRes.value.id,
        userId,
        { content: data.resumeText },
        data.skills || undefined
      );
      if (!updateRes.ok) {
        return err(updateRes.error);
      }
      savedResume = updateRes.value;
    } else {
      const createRes = await resumeDal.createMasterResume(
        {
          userId,
          content: data.resumeText,
          label: "Default",
          isActive: true,
          version: 1,
        },
        data.skills || undefined
      );
      if (!createRes.ok) {
        return err(createRes.error);
      }
      savedResume = createRes.value;
    }

    const finalProfile: ProfileSelect = {
      id: savedResume.id,
      userId,
      resumeText: data.resumeText,
      rawText: data.rawText || data.resumeText,
      summary: data.summary || null,
      skills: data.skills || [],
      education: (data.education as EducationItem[]) || [],
      experience: (data.experience as ExperienceItem[]) || [],
      aiProvider: data.aiProvider || "gemini",
      updatedAt: savedResume.updatedAt,
    };

    return ok(finalProfile);
  } catch (error) {
    return err(new AppError("DB_ERROR", "Failed to upsert profile", error));
  }
}

