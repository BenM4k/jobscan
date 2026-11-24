import "server-only";
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
  diffFromPrevious?: unknown,
  language?: "en" | "fr"
): Promise<Result<TailoredResumeSelect, AppError>> {
  try {
    const currentRecord = await db.transaction(async (tx) => {
      const [upserted] = await tx
        .insert(tailoredResume)
        .values({
          pipelineEntryId,
          content,
          strategyLabel,
          ...(language ? { language } : {}),
        })
        .onConflictDoUpdate({
          target: [tailoredResume.pipelineEntryId],
          set: {
            content,
            ...(strategyLabel !== undefined ? { strategyLabel } : {}),
            ...(language ? { language } : {}),
            updatedAt: new Date(),
          },
        })
        .returning();

      await tx.insert(tailoredResumeVersion).values({
        tailoredResumeId: upserted.id,
        content,
        diffFromPrevious: diffFromPrevious || null,
      });

      return upserted;
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
    const currentRecord = await db.transaction(async (tx) => {
      const [upserted] = await tx
        .insert(tailoredCoverLetter)
        .values({
          pipelineEntryId,
          content,
        })
        .onConflictDoUpdate({
          target: [tailoredCoverLetter.pipelineEntryId],
          set: {
            content,
            updatedAt: new Date(),
          },
        })
        .returning();

      await tx.insert(coverLetterVersion).values({
        tailoredCoverLetterId: upserted.id,
        content,
        diffFromPrevious: diffFromPrevious || null,
      });

      return upserted;
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
