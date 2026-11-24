import "server-only";
import { db } from "@/services/db";
import { skill, jobSkill } from "@/services/db/schema/skills";
import { normalizeSkillName } from "@/services/skills/normalize";
import { eq, inArray } from "drizzle-orm";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";

export { getResumeSkills, syncResumeSkills } from "./resume.dal";

/**
 * Fetch all skills linked to a specific job.
 */
export async function getJobSkills(
  jobId: string,
): Promise<Result<string[], AppError>> {
  try {
    const rows = await db
      .select({ name: skill.name })
      .from(jobSkill)
      .innerJoin(skill, eq(jobSkill.skillId, skill.id))
      .where(eq(jobSkill.jobId, jobId));
    return ok(rows.map((r) => r.name));
  } catch (error) {
    return err(
      new AppError(
        "DB_ERROR",
        `Failed to fetch skills for job ${jobId}`,
        error,
      ),
    );
  }
}

/**
 * Synchronize the skills required or preferred for a specific job into `job_skill`.
 * Upserts skill names in the global `skill` table and refreshes `job_skill` entries.
 */
export async function syncJobSkills(
  jobId: string,
  skillNames: string[],
  required: boolean = true,
): Promise<Result<void, AppError>> {
  try {
    return await db.transaction(async (tx) => {
      // Clear existing job skills for this job
      await tx.delete(jobSkill).where(eq(jobSkill.jobId, jobId));

      const cleanNames = Array.from(
        new Set(
          skillNames
            .map((n) => normalizeSkillName(n))
            .filter((n) => n.length > 0),
        ),
      );

      if (cleanNames.length === 0) return ok(undefined);

      await tx
        .insert(skill)
        .values(cleanNames.map((name) => ({ name })))
        .onConflictDoNothing({ target: skill.name });

      const skillRows = await tx
        .select({ id: skill.id })
        .from(skill)
        .where(inArray(skill.name, cleanNames));

      if (skillRows.length > 0) {
        await tx
          .insert(jobSkill)
          .values(
            skillRows.map((sk) => ({
              jobId,
              skillId: sk.id,
              required,
            })),
          )
          .onConflictDoNothing();
      }

      return ok(undefined);
    });
  } catch (error) {
    return err(
      new AppError(
        "DB_ERROR",
        `Failed to sync job skills for job ${jobId}`,
        error,
      ),
    );
  }
}
