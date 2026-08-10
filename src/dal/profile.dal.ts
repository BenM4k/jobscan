import "server-only";
import { db } from "@/services/db";
import { profile } from "@/services/db/schema";
import { ok, err, Result } from "@/lib/result";

import { AppError } from "@/lib/errors";

export type ProfileInsert = typeof profile.$inferInsert;
export type ProfileSelect = typeof profile.$inferSelect;

export async function getProfile(): Promise<Result<ProfileSelect | null, AppError>> {
  try {
    const [existing] = await db.select().from(profile).limit(1);
    return ok(existing || null);
  } catch (error) {
    return err(new AppError("DB_ERROR", "Failed to fetch profile", error));
  }
}

export async function upsertProfile(
  data: { resumeText: string; skills?: string[]; aiProvider?: string }
): Promise<Result<ProfileSelect, AppError>> {
  try {
    const existingResult = await getProfile();
    if (!existingResult.ok) {
      return existingResult;
    }

    if (existingResult.value) {
      const [updated] = await db
        .update(profile)
        .set({
          resumeText: data.resumeText,
          skills: data.skills ?? existingResult.value.skills,
          aiProvider: data.aiProvider ?? existingResult.value.aiProvider,
          updatedAt: new Date(),
        })
        .where(db.query ? undefined : undefined) // update single profile
        .returning();

      return ok(updated);
    } else {
      const [created] = await db
        .insert(profile)
        .values({
          resumeText: data.resumeText,
          skills: data.skills ?? [],
          aiProvider: data.aiProvider ?? "gemini",
        })
        .returning();

      return ok(created);
    }
  } catch (error) {
    return err(new AppError("DB_ERROR", "Failed to upsert profile", error));
  }
}
