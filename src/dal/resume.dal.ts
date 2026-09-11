import "server-only";
import { db } from "@/services/db";
import {
  masterResume,
  resumeSkill,
  skill,
  tailoredResume,
  pipelineEntry,
} from "@/services/db/schema";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";
import { eq, and, desc, sql } from "drizzle-orm";
import { generateEmbedding } from "@/services/ai/embed";
import { normalizeSkillName } from "@/services/skills/normalize";

export type MasterResumeSelect = typeof masterResume.$inferSelect;
export type MasterResumeInsert = typeof masterResume.$inferInsert;

export async function getMasterResumes(
  userId: string
): Promise<Result<MasterResumeSelect[], AppError>> {
  try {
    const list = await db
      .select()
      .from(masterResume)
      .where(eq(masterResume.userId, userId))
      .orderBy(desc(masterResume.isActive), desc(masterResume.updatedAt));
    return ok(list);
  } catch (error) {
    return err(new AppError("DB_ERROR", "Failed to fetch master resumes", error));
  }
}

export async function getActiveMasterResume(
  userId: string
): Promise<Result<MasterResumeSelect | null, AppError>> {
  try {
    const [found] = await db
      .select()
      .from(masterResume)
      .where(and(eq(masterResume.userId, userId), eq(masterResume.isActive, true)))
      .limit(1);
    if (found) return ok(found);

    // Fallback to latest resume if none explicitly marked active
    const [latest] = await db
      .select()
      .from(masterResume)
      .where(eq(masterResume.userId, userId))
      .orderBy(desc(masterResume.updatedAt))
      .limit(1);

    return ok(latest || null);
  } catch (error) {
    return err(new AppError("DB_ERROR", "Failed to fetch active master resume", error));
  }
}

export async function getMasterResumeById(
  id: string,
  userId: string
): Promise<Result<MasterResumeSelect | null, AppError>> {
  try {
    const [found] = await db
      .select()
      .from(masterResume)
      .where(and(eq(masterResume.id, id), eq(masterResume.userId, userId)))
      .limit(1);
    return ok(found || null);
  } catch (error) {
    return err(new AppError("DB_ERROR", `Failed to fetch resume ${id}`, error));
  }
}

export const getActiveResume = getActiveMasterResume;
export const getResumeById = getMasterResumeById;

export async function createMasterResume(
  data: MasterResumeInsert,
  skills?: string[]
): Promise<Result<MasterResumeSelect, AppError>> {
  try {
    // If setting as active, deactivate other personas and create in one transaction
    const created = await db.transaction(async (tx) => {
      if (data.isActive) {
        await tx
          .update(masterResume)
          .set({ isActive: false })
          .where(eq(masterResume.userId, data.userId));
      }

      const [res] = await tx
        .insert(masterResume)
        .values(data)
        .returning();

      return res;
    });

    if (!created) {
      return err(new AppError("DB_ERROR", "Failed to create master resume"));
    }

    if (skills && skills.length > 0) {
      await syncResumeSkills(created.id, skills);
    }

    // Generate embedding asynchronously — never block the response on this
    generateEmbedding(created.content)
      .then((embRes) => {
        if (!embRes.ok) {
          console.warn("Resume embedding generation failed (create):", embRes.error.message);
          return;
        }
        return setResumeEmbedding(created.id, created.userId, embRes.value);
      })
      .catch((e) => console.warn("Resume embedding write failed (create):", e));

    return ok(created);
  } catch (error) {
    return err(new AppError("DB_ERROR", "Failed to create master resume", error));
  }
}

export async function updateMasterResume(
  id: string,
  userId: string,
  data: Partial<Omit<MasterResumeInsert, "id" | "userId">>,
  skills?: string[]
): Promise<Result<MasterResumeSelect, AppError>> {
  try {
    const updated = await db.transaction(async (tx) => {
      const [target] = await tx
        .select({ id: masterResume.id })
        .from(masterResume)
        .where(and(eq(masterResume.id, id), eq(masterResume.userId, userId)))
        .limit(1);

      if (!target) {
        return null;
      }

      if (data.isActive) {
        await tx
          .update(masterResume)
          .set({ isActive: false })
          .where(eq(masterResume.userId, userId));
      }

      const [res] = await tx
        .update(masterResume)
        .set({
          ...data,
          ...(data.content ? { version: sql`${masterResume.version} + 1` } : {}),
          updatedAt: new Date(),
        })
        .where(and(eq(masterResume.id, id), eq(masterResume.userId, userId)))
        .returning();

      return res;
    });

    if (!updated) {
      return err(new AppError("NOT_FOUND", `Master resume ${id} not found`));
    }

    if (skills) {
      await syncResumeSkills(updated.id, skills);
    }

    // Re-embed only if resume content changed
    if (data.content) {
      generateEmbedding(updated.content)
        .then((embRes) => {
          if (!embRes.ok) {
            console.warn("Resume embedding generation failed (update):", embRes.error.message);
            return;
          }
          return setResumeEmbedding(updated.id, updated.userId, embRes.value);
        })
        .catch((e) => console.warn("Resume embedding write failed (update):", e));
    }

    return ok(updated);
  } catch (error) {
    return err(new AppError("DB_ERROR", `Failed to update master resume ${id}`, error));
  }
}

export async function setActiveMasterResume(
  id: string,
  userId: string
): Promise<Result<boolean, AppError>> {
  try {
    return await db.transaction(async (tx) => {
      const [target] = await tx
        .select({ id: masterResume.id })
        .from(masterResume)
        .where(and(eq(masterResume.id, id), eq(masterResume.userId, userId)))
        .limit(1);

      if (!target) {
        return err(new AppError("NOT_FOUND", `Resume ${id} not found`));
      }

      await tx
        .update(masterResume)
        .set({ isActive: false })
        .where(eq(masterResume.userId, userId));

      await tx
        .update(masterResume)
        .set({ isActive: true })
        .where(and(eq(masterResume.id, id), eq(masterResume.userId, userId)));

      return ok(true);
    });
  } catch (error) {
    return err(new AppError("DB_ERROR", `Failed to set active resume ${id}`, error));
  }
}

export async function getResumeSkills(
  resumeId: string
): Promise<Result<string[], AppError>> {
  try {
    const rows = await db
      .select({ name: skill.name })
      .from(resumeSkill)
      .innerJoin(skill, eq(resumeSkill.skillId, skill.id))
      .where(eq(resumeSkill.resumeId, resumeId));
    return ok(rows.map((r) => r.name));
  } catch (error) {
    return err(new AppError("DB_ERROR", `Failed to fetch skills for resume ${resumeId}`, error));
  }
}

export async function syncResumeSkills(
  resumeId: string,
  skillNames: string[]
): Promise<Result<void, AppError>> {
  try {
    return await db.transaction(async (tx) => {
      await tx.delete(resumeSkill).where(eq(resumeSkill.resumeId, resumeId));
      const cleanNames = Array.from(
        new Set(
          skillNames
            .map((n) => normalizeSkillName(n))
            .filter((n) => n.length > 0)
        )
      );
      if (cleanNames.length === 0) return ok(undefined);

      for (const name of cleanNames) {
        const [sk] = await tx
          .insert(skill)
          .values({ name })
          .onConflictDoUpdate({
            target: skill.name,
            set: { name },
          })
          .returning();

        if (sk) {
          await tx
            .insert(resumeSkill)
            .values({
              resumeId,
              skillId: sk.id,
            })
            .onConflictDoNothing();
        }
      }
      return ok(undefined);
    });
  } catch (error) {
    return err(new AppError("DB_ERROR", "Failed to sync resume skills", error));
  }
}

/**
 * Store a pre-computed embedding vector on a master_resume row.
 * Kept separate from content updates so the embedding step can be
 * fire-and-forget without retrying the full upsert on failure.
 */
export async function setResumeEmbedding(
  resumeId: string,
  userId: string,
  embedding: number[]
): Promise<Result<void, AppError>> {
  try {
    // Cast the JS number[] to the pgvector literal format expected by Drizzle
    const vectorLiteral = `[${embedding.join(",")}]`;
    await db
      .update(masterResume)
      .set({ embedding: sql`${vectorLiteral}::vector`, updatedAt: new Date() })
      .where(and(eq(masterResume.id, resumeId), eq(masterResume.userId, userId)));
    return ok(undefined);
  } catch (error) {
    return err(
      new AppError("DB_ERROR", `Failed to set embedding for resume ${resumeId}`, error)
    );
  }
}

export interface PromoteTailoredResumeResult {
  newMasterResume: MasterResumeSelect;
  previousActiveId: string | null;
}

/**
 * Promotes a tailored resume to an active master persona.
 * Demotes the user's currently active persona, inserts the new persona with
 * source: "promoted_tailored", language inherited from tailoredResume, version: 1,
 * and auto-activates it.
 */
export async function promoteTailoredResumeToMaster(
  tailoredResumeId: string,
  userId: string,
  label: string
): Promise<Result<PromoteTailoredResumeResult, AppError>> {
  try {
    // 1. Verify tailored resume existence and ownership via pipelineEntry
    const [tailored] = await db
      .select({
        id: tailoredResume.id,
        content: tailoredResume.content,
        language: tailoredResume.language,
        userId: pipelineEntry.userId,
      })
      .from(tailoredResume)
      .innerJoin(pipelineEntry, eq(tailoredResume.pipelineEntryId, pipelineEntry.id))
      .where(and(eq(tailoredResume.id, tailoredResumeId), eq(pipelineEntry.userId, userId)))
      .limit(1);

    if (!tailored) {
      return err(new AppError("NOT_FOUND", "Tailored resume not found or unauthorized"));
    }

    // 2. Perform promotion in a transaction: capture previous active ID, demote, insert new active
    const result = await db.transaction(async (tx) => {
      const [currentActive] = await tx
        .select({ id: masterResume.id })
        .from(masterResume)
        .where(and(eq(masterResume.userId, userId), eq(masterResume.isActive, true)))
        .limit(1);

      const previousActiveId = currentActive?.id || null;

      // Demote all personas
      await tx
        .update(masterResume)
        .set({ isActive: false })
        .where(eq(masterResume.userId, userId));

      // Insert new persona
      const [created] = await tx
        .insert(masterResume)
        .values({
          userId,
          label: label.trim() || "Promoted Persona",
          content: tailored.content,
          isActive: true,
          version: 1,
          language: tailored.language,
          source: "promoted_tailored",
          promotedFromTailoredResumeId: tailored.id,
        })
        .returning();

      return {
        newMasterResume: created,
        previousActiveId,
      };
    });

    if (!result.newMasterResume) {
      return err(new AppError("DB_ERROR", "Failed to create promoted master resume"));
    }

    // 3. Generate embedding asynchronously (fire-and-forget)
    generateEmbedding(result.newMasterResume.content)
      .then((embRes) => {
        if (!embRes.ok) {
          console.warn("Resume embedding generation failed (promote):", embRes.error.message);
          return;
        }
        return setResumeEmbedding(
          result.newMasterResume.id,
          result.newMasterResume.userId,
          embRes.value
        );
      })
      .catch((e) => console.warn("Resume embedding write failed (promote):", e));

    return ok(result);
  } catch (error) {
    return err(
      new AppError("DB_ERROR", "Failed to promote tailored resume to master", error)
    );
  }
}

/**
 * Reverts the active persona back to previousActiveId (used by undo toast).
 */
export async function revertActiveResume(
  userId: string,
  previousActiveId: string
): Promise<Result<boolean, AppError>> {
  try {
    return await db.transaction(async (tx) => {
      const [target] = await tx
        .select({ id: masterResume.id })
        .from(masterResume)
        .where(and(eq(masterResume.id, previousActiveId), eq(masterResume.userId, userId)))
        .limit(1);

      if (!target) {
        return err(new AppError("NOT_FOUND", "Previous active resume not found"));
      }

      await tx
        .update(masterResume)
        .set({ isActive: false })
        .where(eq(masterResume.userId, userId));

      await tx
        .update(masterResume)
        .set({ isActive: true })
        .where(and(eq(masterResume.id, previousActiveId), eq(masterResume.userId, userId)));

      return ok(true);
    });
  } catch (error) {
    return err(new AppError("DB_ERROR", "Failed to revert active resume", error));
  }
}

/**
 * Deletes a master resume persona.
 */
export async function deleteMasterResume(
  id: string,
  userId: string
): Promise<Result<{ deletedId: string; fallbackActiveId: string | null }, AppError>> {
  try {
    return await db.transaction(async (tx) => {
      const [target] = await tx
        .select()
        .from(masterResume)
        .where(and(eq(masterResume.id, id), eq(masterResume.userId, userId)))
        .limit(1);

      if (!target) {
        return err(new AppError("NOT_FOUND", `Resume ${id} not found`));
      }

      await tx
        .delete(masterResume)
        .where(and(eq(masterResume.id, id), eq(masterResume.userId, userId)));

      // If the deleted resume was active, set the most recent remaining one active
      let fallbackActiveId: string | null = null;
      if (target.isActive) {
        const [nextActive] = await tx
          .select({ id: masterResume.id })
          .from(masterResume)
          .where(eq(masterResume.userId, userId))
          .orderBy(desc(masterResume.updatedAt))
          .limit(1);

        if (nextActive) {
          fallbackActiveId = nextActive.id;
          await tx
            .update(masterResume)
            .set({ isActive: true })
            .where(eq(masterResume.id, nextActive.id));
        }
      }

      return ok({ deletedId: id, fallbackActiveId });
    });
  } catch (error) {
    return err(new AppError("DB_ERROR", "Failed to delete master resume", error));
  }
}
