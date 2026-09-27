import "server-only";
import { db } from "@/services/db";
import { profile } from "@/services/db/schema/legacy";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";
import { eq, sql } from "drizzle-orm";
import * as resumeDal from "./resume.dal";

import type { EducationItem, ExperienceItem } from "@/lib/ai";

export type ProfileInsert = typeof profile.$inferInsert;
export type ProfileSelect = typeof profile.$inferSelect;
import { parseResumeContent } from "@/lib/resume-format";

export async function getProfile(
  userId: string
): Promise<Result<ProfileSelect | null, AppError>> {
  try {
    // 1. Check canonical master_resume table (source of truth per AGENTS.md)
    const activeRes = await resumeDal.getActiveMasterResume(userId);
    if (!activeRes.ok) {
      return err(activeRes.error);
    }

    const activeResume = activeRes.value;

    // 2. Safe check on legacy profile table (in case it exists and has structured data)
    let legacyProfile: ProfileSelect | null = null;
    try {
      const [existing] = await db
        .select()
        .from(profile)
        .where(eq(profile.userId, userId))
        .limit(1);
      legacyProfile = existing || null;
    } catch {
      // Legacy table dropped in migration 0010; safely proceed with canonical master_resume
    }

    const activeContent = activeResume?.content?.trim() || "";
    const legacyContent = legacyProfile?.resumeText?.trim() || "";

    // If neither table has any resume text, user has no active resume
    if (!activeContent && !legacyContent) {
      return ok(null);
    }

    // Prefer canonical master_resume content if available
    const chosenResumeText = activeContent || legacyContent;

    // Retrieve skills: prefer canonical resume_skill rows, fallback to legacy profile skills, then markdown
    let skills: string[] = [];
    if (activeResume) {
      const skillsRes = await resumeDal.getResumeSkills(activeResume.id);
      if (skillsRes.ok && skillsRes.value && skillsRes.value.length > 0) {
        skills = skillsRes.value;
      }
    }
    if (skills.length === 0 && legacyProfile?.skills && legacyProfile.skills.length > 0) {
      skills = legacyProfile.skills;
    }

    // Parse structured markdown sections from resume content
    const parsed = parseResumeContent(chosenResumeText);

    if (skills.length === 0 && parsed.skills.length > 0) {
      skills = parsed.skills;
    }

    const summary = legacyProfile?.summary || parsed.summary || null;
    const education =
      legacyProfile?.education && legacyProfile.education.length > 0
        ? legacyProfile.education
        : parsed.education;
    const experience =
      legacyProfile?.experience && legacyProfile.experience.length > 0
        ? legacyProfile.experience
        : parsed.experience;

    const synthesizedProfile: ProfileSelect = {
      id: activeResume?.id || legacyProfile?.id || userId,
      userId: activeResume?.userId || legacyProfile?.userId || userId,
      resumeText: chosenResumeText,
      rawText: legacyProfile?.rawText || activeResume?.content || chosenResumeText,
      summary,
      skills,
      education: education as EducationItem[],
      experience: experience as ExperienceItem[],
      aiProvider: legacyProfile?.aiProvider || "gemini",
      updatedAt: activeResume?.updatedAt || legacyProfile?.updatedAt || new Date(),
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
    // 1. Always update or create the canonical master_resume first
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

    // 2. Best-effort mirror to legacy profile table if it exists in current environment
    let legacyUpserted: ProfileSelect | null = null;
    try {
      const [upserted] = await db
        .insert(profile)
        .values({
          userId,
          resumeText: data.resumeText,
          rawText: data.rawText,
          summary: data.summary,
          skills: data.skills ?? [],
          education: data.education ?? [],
          experience: data.experience ?? [],
          aiProvider: data.aiProvider ?? "gemini",
        })
        .onConflictDoUpdate({
          target: profile.userId,
          set: {
            resumeText: data.resumeText,
            rawText: data.rawText !== undefined ? data.rawText : sql`${profile.rawText}`,
            summary: data.summary !== undefined ? data.summary : sql`${profile.summary}`,
            skills: data.skills !== undefined ? data.skills : sql`${profile.skills}`,
            education: data.education !== undefined ? data.education : sql`${profile.education}`,
            experience: data.experience !== undefined ? data.experience : sql`${profile.experience}`,
            aiProvider: data.aiProvider !== undefined ? data.aiProvider : sql`${profile.aiProvider}`,
            updatedAt: new Date(),
          },
        })
        .returning();
      legacyUpserted = upserted || null;
    } catch {
      // Legacy table dropped in migration 0010; ignore safely
    }

    const finalProfile: ProfileSelect = legacyUpserted || {
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

