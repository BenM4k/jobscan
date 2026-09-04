if (typeof window !== "undefined") {
  throw new Error("This module can only be executed on the server.");
}
import { db } from "@/services/db";
import { skill } from "@/services/db/schema";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";
import { eq, sql } from "drizzle-orm";

export type SkillSelect = typeof skill.$inferSelect;
export type SkillInsert = typeof skill.$inferInsert;

export async function getSkillByName(
  name: string
): Promise<Result<SkillSelect | null, AppError>> {
  try {
    const [found] = await db
      .select()
      .from(skill)
      .where(eq(skill.name, name.trim()))
      .limit(1);
    return ok(found || null);
  } catch (error) {
    return err(new AppError("DB_ERROR", `Failed to get skill ${name}`, error));
  }
}

export async function searchSkills(
  query: string,
  limit: number = 20
): Promise<Result<SkillSelect[], AppError>> {
  try {
    const trimmed = query.trim();
    if (!trimmed) {
      return ok([]);
    }
    // Using pg_trgm similarity or trigram ilike
    const results = await db
      .select()
      .from(skill)
      .where(sql`${skill.name} % ${trimmed} OR ${skill.name} ILIKE ${`%${trimmed}%`}`)
      .limit(limit);
    return ok(results);
  } catch (error) {
    return err(new AppError("DB_ERROR", `Failed to search skills`, error));
  }
}

export async function upsertSkills(
  names: string[]
): Promise<Result<SkillSelect[], AppError>> {
  try {
    const cleanNames = names.map((n) => n.trim()).filter(Boolean);
    if (cleanNames.length === 0) return ok([]);

    const insertedList: SkillSelect[] = [];
    for (const name of cleanNames) {
      const [res] = await db
        .insert(skill)
        .values({ name })
        .onConflictDoUpdate({
          target: skill.name,
          set: { name },
        })
        .returning();
      if (res) insertedList.push(res);
    }

    return ok(insertedList);
  } catch (error) {
    return err(new AppError("DB_ERROR", "Failed to upsert skills", error));
  }
}
