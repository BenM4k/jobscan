import "server-only";
import { db } from "@/services/db";
import { profile } from "@/services/db/schema";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";
import { eq } from "drizzle-orm";

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
    const existingResult = await getProfile(userId);
    if (!existingResult.ok) {
      return existingResult;
    }

    if (existingResult.value) {
      const [updated] = await db
        .update(profile)
        .set({
          resumeText: data.resumeText,
          rawText: data.rawText ?? existingResult.value.rawText,
          summary: data.summary ?? existingResult.value.summary,
          skills: data.skills ?? existingResult.value.skills,
          education: data.education ?? existingResult.value.education,
          experience: data.experience ?? existingResult.value.experience,
          aiProvider: data.aiProvider ?? existingResult.value.aiProvider,
          updatedAt: new Date(),
        })
        .where(eq(profile.id, existingResult.value.id))
        .returning();

      return ok(updated);
    } else {
      const [created] = await db
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
        .returning();

      return ok(created);
    }
  } catch (error) {
    return err(new AppError("DB_ERROR", "Failed to upsert profile", error));
  }
}

