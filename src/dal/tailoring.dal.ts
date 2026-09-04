if (typeof window !== "undefined") {
  throw new Error("This module can only be executed on the server.");
}
import { db } from "@/services/db";
import {
  tailoredResume,
  tailoredResumeVersion,
  tailoredCoverLetter,
  coverLetterVersion,
} from "@/services/db/schema";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";
import { eq, desc } from "drizzle-orm";

export type TailoredResumeSelect = typeof tailoredResume.$inferSelect;
export type TailoredResumeVersionSelect = typeof tailoredResumeVersion.$inferSelect;
export type TailoredCoverLetterSelect = typeof tailoredCoverLetter.$inferSelect;
export type CoverLetterVersionSelect = typeof coverLetterVersion.$inferSelect;

export async function getTailoredResume(
  pipelineEntryId: string
): Promise<Result<TailoredResumeSelect | null, AppError>> {
  try {
    const [found] = await db
      .select()
      .from(tailoredResume)
      .where(eq(tailoredResume.pipelineEntryId, pipelineEntryId))
      .limit(1);
    return ok(found || null);
  } catch (error) {
    return err(
      new AppError("DB_ERROR", "Failed to get tailored resume", error)
    );
  }
}

export async function saveTailoredResume(
  pipelineEntryId: string,
  content: string,
  strategyLabel?: string,
  diffFromPrevious?: unknown
): Promise<Result<TailoredResumeSelect, AppError>> {
  try {
    const existingRes = await getTailoredResume(pipelineEntryId);
    if (!existingRes.ok) return err(existingRes.error);
    const existing = existingRes.value;

    let currentRecord: TailoredResumeSelect;

    if (existing) {
      const [updated] = await db
        .update(tailoredResume)
        .set({
          content,
          strategyLabel: strategyLabel ?? existing.strategyLabel,
          updatedAt: new Date(),
        })
        .where(eq(tailoredResume.id, existing.id))
        .returning();
      currentRecord = updated;
    } else {
      const [inserted] = await db
        .insert(tailoredResume)
        .values({
          pipelineEntryId,
          content,
          strategyLabel,
        })
        .returning();
      currentRecord = inserted;
    }

    // Save version snapshot
    await db.insert(tailoredResumeVersion).values({
      tailoredResumeId: currentRecord.id,
      content,
      diffFromPrevious: diffFromPrevious || null,
    });

    return ok(currentRecord);
  } catch (error) {
    return err(
      new AppError("DB_ERROR", "Failed to save tailored resume", error)
    );
  }
}

export async function getTailoredCoverLetter(
  pipelineEntryId: string
): Promise<Result<TailoredCoverLetterSelect | null, AppError>> {
  try {
    const [found] = await db
      .select()
      .from(tailoredCoverLetter)
      .where(eq(tailoredCoverLetter.pipelineEntryId, pipelineEntryId))
      .limit(1);
    return ok(found || null);
  } catch (error) {
    return err(
      new AppError("DB_ERROR", "Failed to get tailored cover letter", error)
    );
  }
}

export async function saveTailoredCoverLetter(
  pipelineEntryId: string,
  content: string,
  diffFromPrevious?: unknown
): Promise<Result<TailoredCoverLetterSelect, AppError>> {
  try {
    const existingRes = await getTailoredCoverLetter(pipelineEntryId);
    if (!existingRes.ok) return err(existingRes.error);
    const existing = existingRes.value;

    let currentRecord: TailoredCoverLetterSelect;

    if (existing) {
      const [updated] = await db
        .update(tailoredCoverLetter)
        .set({
          content,
          updatedAt: new Date(),
        })
        .where(eq(tailoredCoverLetter.id, existing.id))
        .returning();
      currentRecord = updated;
    } else {
      const [inserted] = await db
        .insert(tailoredCoverLetter)
        .values({
          pipelineEntryId,
          content,
        })
        .returning();
      currentRecord = inserted;
    }

    // Save version snapshot
    await db.insert(coverLetterVersion).values({
      tailoredCoverLetterId: currentRecord.id,
      content,
      diffFromPrevious: diffFromPrevious || null,
    });

    return ok(currentRecord);
  } catch (error) {
    return err(
      new AppError("DB_ERROR", "Failed to save tailored cover letter", error)
    );
  }
}

export async function getTailoredResumeVersions(
  tailoredResumeId: string
): Promise<Result<TailoredResumeVersionSelect[], AppError>> {
  try {
    const list = await db
      .select()
      .from(tailoredResumeVersion)
      .where(eq(tailoredResumeVersion.tailoredResumeId, tailoredResumeId))
      .orderBy(desc(tailoredResumeVersion.createdAt));
    return ok(list);
  } catch (error) {
    return err(
      new AppError("DB_ERROR", "Failed to fetch resume versions", error)
    );
  }
}

export async function getCoverLetterVersions(
  tailoredCoverLetterId: string
): Promise<Result<CoverLetterVersionSelect[], AppError>> {
  try {
    const list = await db
      .select()
      .from(coverLetterVersion)
      .where(eq(coverLetterVersion.tailoredCoverLetterId, tailoredCoverLetterId))
      .orderBy(desc(coverLetterVersion.createdAt));
    return ok(list);
  } catch (error) {
    return err(
      new AppError("DB_ERROR", "Failed to fetch cover letter versions", error)
    );
  }
}
