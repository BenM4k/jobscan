if (typeof window !== "undefined") {
  throw new Error("This module can only be executed on the server.");
}
import { db } from "@/services/db";
import { profile } from "@/services/db/schema/legacy";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";
import { eq, sql } from "drizzle-orm";
import * as resumeDal from "./resume.dal";

export type ProfileInsert = typeof profile.$inferInsert;
export type ProfileSelect = typeof profile.$inferSelect;

export async function getProfile(
  userId: string
): Promise<Result<ProfileSelect | null, AppError>> {
  try {
    const [existing] = await db
      .select()
      .from(profile)
      .where(eq(profile.userId, userId))
      .limit(1);
    return ok(existing || null);
  } catch (error) {
    return err(new AppError("DB_ERROR", "Failed to fetch profile", error));
  }
}

export async function upsertProfile(
  userId: string,
  data: Partial<Omit<ProfileInsert, "id" | "userId">> & { resumeText: string }
): Promise<Result<ProfileSelect, AppError>> {
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
          // Preserve existing value when caller doesn't supply a new one.
          // sql`EXCLUDED.field` refers to the value from the attempted insert row.
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

    if (upserted) {
      const activeRes = await resumeDal.getActiveMasterResume(userId);
      if (!activeRes.ok) {
        return err(activeRes.error);
      }

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
      }
    }

    return ok(upserted);
  } catch (error) {
    return err(new AppError("DB_ERROR", "Failed to upsert profile", error));
  }
}

