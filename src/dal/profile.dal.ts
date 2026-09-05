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

export interface ParsedResumeSections {
  summary: string;
  skills: string[];
  education: EducationItem[];
  experience: ExperienceItem[];
}

/**
 * Parses markdown resume text (e.g. sections created by saveMasterResumeAction
 * or AI formatters) into structured summary, skills, experience, and education.
 */
export function parseResumeContent(content: string): ParsedResumeSections {
  if (!content || !content.trim()) {
    return { summary: "", skills: [], education: [], experience: [] };
  }

  let summary = "";
  const skills: string[] = [];
  const education: EducationItem[] = [];
  const experience: ExperienceItem[] = [];

  // 1. Summary
  const summaryMatch = content.match(
    /##\s*(?:Professional\s+)?Summary\s*\n+([\s\S]*?)(?=\n+##\s+|$)/i
  );
  if (summaryMatch && summaryMatch[1]) {
    summary = summaryMatch[1].trim();
  }

  // 2. Skills
  const skillsMatch = content.match(
    /##\s*(?:Core\s+)?(?:Technical\s+)?Skills\s*\n+([\s\S]*?)(?=\n+##\s+|$)/i
  );
  if (skillsMatch && skillsMatch[1]) {
    const rawSkills = skillsMatch[1]
      .split(/[,•\n]+/)
      .map((s) => s.trim().replace(/^[-*]\s*/, ""))
      .filter(Boolean);
    skills.push(...Array.from(new Set(rawSkills)));
  }

  // 3. Work Experience
  const expMatch = content.match(
    /##\s*Work\s+Experience\s*\n+([\s\S]*?)(?=\n+##\s+|$)/i
  );
  if (expMatch && expMatch[1]) {
    const expBlocks = expMatch[1].split(/\n+(?=###\s+)/);
    for (const block of expBlocks) {
      const trimmed = block.trim();
      if (!trimmed.startsWith("###")) continue;

      const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
      const headerLine = lines[0].replace(/^###\s*/, "");

      let title = headerLine;
      let company = "";
      let period = "";

      const periodInParenMatch = headerLine.match(/\(([^)]+)\)$/);
      let rest = headerLine;
      if (periodInParenMatch) {
        period = periodInParenMatch[1].trim();
        rest = headerLine.replace(/\s*\([^)]+\)$/, "").trim();
      }

      const separatorMatch = rest.split(/\s*[—–-]\s*/);
      if (separatorMatch.length >= 2) {
        title = separatorMatch[0].trim();
        company = separatorMatch.slice(1).join(" — ").trim();
      }

      let bulletStartIndex = 1;
      if (lines.length > 1 && /^_[^_]+_$/.test(lines[1])) {
        const italicContent = lines[1].replace(/^_|_$/g, "").trim();
        const [p] = italicContent.split(/\s*\|\s*/);
        if (!period && p) period = p.trim();
        bulletStartIndex = 2;
      }

      const bullets: string[] = [];
      for (let i = bulletStartIndex; i < lines.length; i++) {
        const line = lines[i];
        const cleanedBullet = line.replace(/^[•\-*]\s*/, "").trim();
        if (cleanedBullet) {
          bullets.push(cleanedBullet);
        }
      }

      const dates = period ? period.split(/\s*[—–-]\s*/) : [];

      experience.push({
        company: company || "Company",
        title: title || "Role",
        startDate: dates[0]?.trim() || undefined,
        endDate: dates.length > 1 ? dates[1]?.trim() : (period || undefined),
        bullets: bullets.length > 0 ? bullets : [lines.slice(bulletStartIndex).join(" ")].filter(Boolean),
      });
    }
  }

  // 4. Education
  const eduMatch = content.match(
    /##\s*Education(?:\s*&\s*Credentials)?\s*\n+([\s\S]*?)(?=\n+##\s+|$)/i
  );
  if (eduMatch && eduMatch[1]) {
    const eduLines = eduMatch[1].split("\n").map((l) => l.trim()).filter(Boolean);
    for (const line of eduLines) {
      const cleanLine = line.replace(/^[•\-*]\s*/, "").trim();
      if (!cleanLine) continue;

      let degreeAndField = cleanLine;
      let institution = "";
      let period = "";

      const parenMatch = cleanLine.match(/\(([^)]+)\)$/);
      let rest = cleanLine;
      if (parenMatch) {
        period = parenMatch[1].trim();
        rest = cleanLine.replace(/\s*\([^)]+\)$/, "").trim();
      }

      const sepParts = rest.split(/\s*[—–-]\s*/);
      if (sepParts.length >= 2) {
        degreeAndField = sepParts[0].trim();
        institution = sepParts.slice(1).join(" — ").trim();
      }

      let degree = degreeAndField;
      let field: string | undefined = undefined;
      const inMatch = degreeAndField.match(/^(.+?)\s+in\s+(.+)$/i);
      if (inMatch) {
        degree = inMatch[1].trim();
        field = inMatch[2].trim();
      }

      const dates = period ? period.split(/\s*[—–-]\s*/) : [];

      education.push({
        institution: institution || "Institution",
        degree: degree || "Degree",
        field,
        startDate: dates[0]?.trim() || undefined,
        endDate: dates.length > 1 ? dates[1]?.trim() : (period || undefined),
      });
    }
  }

  // Fallback: if no summary section heading exists and content doesn't start with markdown header
  if (!summary && !content.startsWith("##")) {
    const firstSection = content.split(/\n+##\s+/)[0].trim();
    if (firstSection.length > 0 && firstSection.length < 600) {
      summary = firstSection;
    }
  }

  return { summary, skills, education, experience };
}

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

