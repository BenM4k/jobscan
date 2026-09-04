if (typeof window !== "undefined") {
  throw new Error("This module can only be executed on the server.");
}
import { db } from "@/services/db";
import {
  pipelineEntry,
  pipelineStatusHistory,
  pipelineStatusEnum,
  job,
  jobSourceEnum,
  score,
  tailoredResume,
  tailoredCoverLetter,
} from "@/services/db/schema";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";
import { eq, and, desc, sql, or, ilike, count, gte, lte, ne } from "drizzle-orm";

export type PipelineEntrySelect = typeof pipelineEntry.$inferSelect;
export type PipelineEntryInsert = typeof pipelineEntry.$inferInsert;
export type PipelineStatus = (typeof pipelineStatusEnum.enumValues)[number];
export type JobSource = (typeof jobSourceEnum.enumValues)[number];
export type PipelineStatusHistorySelect = typeof pipelineStatusHistory.$inferSelect;

export interface PipelineEntryWithDetails extends PipelineEntrySelect {
  job: typeof job.$inferSelect;
  score?: typeof score.$inferSelect | null;
  tailoredResume?: typeof tailoredResume.$inferSelect | null;
  tailoredCoverLetter?: typeof tailoredCoverLetter.$inferSelect | null;
}

function latestScoreSubquery() {
  return db
    .selectDistinctOn([score.pipelineEntryId], {
      id: score.id,
      pipelineEntryId: score.pipelineEntryId,
      resumeVersion: score.resumeVersion,
      modelUsed: score.modelUsed,
      cosineSimilarity: score.cosineSimilarity,
      bm25Rank: score.bm25Rank,
      finalScore: score.finalScore,
      matchedSkills: score.matchedSkills,
      missingSkills: score.missingSkills,
      explanation: score.explanation,
      createdAt: score.createdAt,
      updatedAt: score.updatedAt,
    })
    .from(score)
    .orderBy(score.pipelineEntryId, desc(score.createdAt))
    .as("latest_score");
}

function selectScoreFields(sub: ReturnType<typeof latestScoreSubquery>) {
  return {
    id: sub.id,
    pipelineEntryId: sub.pipelineEntryId,
    resumeVersion: sub.resumeVersion,
    modelUsed: sub.modelUsed,
    cosineSimilarity: sub.cosineSimilarity,
    bm25Rank: sub.bm25Rank,
    finalScore: sub.finalScore,
    matchedSkills: sub.matchedSkills,
    missingSkills: sub.missingSkills,
    explanation: sub.explanation,
    createdAt: sub.createdAt,
    updatedAt: sub.updatedAt,
  };
}

export async function getPipelineEntryById(
  id: string,
  userId: string
): Promise<Result<PipelineEntryWithDetails, AppError>> {
  try {
    const latestScore = latestScoreSubquery();
    const rows = await db
      .select({
        entry: pipelineEntry,
        job: job,
        score: selectScoreFields(latestScore),
        tailoredResume: tailoredResume,
        tailoredCoverLetter: tailoredCoverLetter,
      })
      .from(pipelineEntry)
      .innerJoin(job, eq(pipelineEntry.jobId, job.id))
      .leftJoin(latestScore, eq(latestScore.pipelineEntryId, pipelineEntry.id))
      .leftJoin(tailoredResume, eq(tailoredResume.pipelineEntryId, pipelineEntry.id))
      .leftJoin(tailoredCoverLetter, eq(tailoredCoverLetter.pipelineEntryId, pipelineEntry.id))
      .where(and(eq(pipelineEntry.id, id), eq(pipelineEntry.userId, userId)))
      .limit(1);

    if (rows.length === 0) {
      return err(new AppError("NOT_FOUND", `Pipeline entry ${id} not found`));
    }

    const row = rows[0];
    return ok({
      ...row.entry,
      job: row.job,
      score: row.score?.id ? (row.score as typeof score.$inferSelect) : null,
      tailoredResume: row.tailoredResume || null,
      tailoredCoverLetter: row.tailoredCoverLetter || null,
    });
  } catch (error) {
    return err(
      new AppError("DB_ERROR", `Failed to get pipeline entry ${id}`, error)
    );
  }
}

export async function getPipelineEntryByUserAndJob(
  userId: string,
  jobId: string
): Promise<Result<PipelineEntryWithDetails | null, AppError>> {
  try {
    const latestScore = latestScoreSubquery();
    const rows = await db
      .select({
        entry: pipelineEntry,
        job: job,
        score: selectScoreFields(latestScore),
        tailoredResume: tailoredResume,
        tailoredCoverLetter: tailoredCoverLetter,
      })
      .from(pipelineEntry)
      .innerJoin(job, eq(pipelineEntry.jobId, job.id))
      .leftJoin(latestScore, eq(latestScore.pipelineEntryId, pipelineEntry.id))
      .leftJoin(tailoredResume, eq(tailoredResume.pipelineEntryId, pipelineEntry.id))
      .leftJoin(tailoredCoverLetter, eq(tailoredCoverLetter.pipelineEntryId, pipelineEntry.id))
      .where(and(eq(pipelineEntry.userId, userId), eq(pipelineEntry.jobId, jobId)))
      .limit(1);

    if (rows.length === 0) {
      return ok(null);
    }

    const row = rows[0];
    return ok({
      ...row.entry,
      job: row.job,
      score: row.score?.id ? (row.score as typeof score.$inferSelect) : null,
      tailoredResume: row.tailoredResume || null,
      tailoredCoverLetter: row.tailoredCoverLetter || null,
    });
  } catch (error) {
    return err(
      new AppError(
        "DB_ERROR",
        `Failed to find pipeline entry for job ${jobId}`,
        error
      )
    );
  }
}

export async function listPipelineEntries(
  userId: string,
  filter?: {
    status?: PipelineStatus | "all";
    source?: string;
    startDate?: string;
    endDate?: string;
    query?: string;
    limit?: number;
    offset?: number;
  }
): Promise<Result<PipelineEntryWithDetails[], AppError>> {
  try {
    const conditions = [eq(pipelineEntry.userId, userId)];

    if (filter?.status && filter.status !== "all") {
      conditions.push(eq(pipelineEntry.status, filter.status as PipelineStatus));
    } else {
      conditions.push(ne(pipelineEntry.status, "withdrawn"));
    }
    if (filter?.source && filter.source !== "all") {
      conditions.push(eq(job.source, filter.source as JobSource));
    }
    if (filter?.startDate) {
      const start = new Date(filter.startDate);
      if (!isNaN(start.getTime())) {
        conditions.push(
          gte(sql`COALESCE(${job.postedAt}, ${pipelineEntry.createdAt})`, start)
        );
      }
    }
    if (filter?.endDate) {
      const end = new Date(filter.endDate);
      if (!isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        conditions.push(
          lte(sql`COALESCE(${job.postedAt}, ${pipelineEntry.createdAt})`, end)
        );
      }
    }
    if (filter?.query && filter.query.trim()) {
      const q = `%${filter.query.trim()}%`;
      conditions.push(
        or(
          ilike(job.title, q),
          ilike(job.company, q),
          ilike(job.description, q),
          ilike(job.location, q)
        )!
      );
    }

    const limit = filter?.limit ?? 20;
    const offset = filter?.offset ?? 0;

    const latestScore = latestScoreSubquery();
    const rows = await db
      .select({
        entry: pipelineEntry,
        job: job,
        score: selectScoreFields(latestScore),
        tailoredResume: tailoredResume,
        tailoredCoverLetter: tailoredCoverLetter,
      })
      .from(pipelineEntry)
      .innerJoin(job, eq(pipelineEntry.jobId, job.id))
      .leftJoin(latestScore, eq(latestScore.pipelineEntryId, pipelineEntry.id))
      .leftJoin(tailoredResume, eq(tailoredResume.pipelineEntryId, pipelineEntry.id))
      .leftJoin(tailoredCoverLetter, eq(tailoredCoverLetter.pipelineEntryId, pipelineEntry.id))
      .where(and(...conditions))
      .orderBy(desc(job.postedAt), desc(pipelineEntry.createdAt))
      .limit(limit)
      .offset(offset);

    const mapped: PipelineEntryWithDetails[] = rows.map((r) => ({
      ...r.entry,
      job: r.job,
      score: r.score?.id ? (r.score as typeof score.$inferSelect) : null,
      tailoredResume: r.tailoredResume || null,
      tailoredCoverLetter: r.tailoredCoverLetter || null,
    }));

    return ok(mapped);
  } catch (error) {
    return err(
      new AppError("DB_ERROR", "Failed to list pipeline entries", error)
    );
  }
}

export async function countPipelineEntries(
  userId: string,
  filter?: {
    status?: PipelineStatus | "all";
    source?: string;
    startDate?: string;
    endDate?: string;
    query?: string;
  }
): Promise<Result<number, AppError>> {
  try {
    const conditions = [eq(pipelineEntry.userId, userId)];

    if (filter?.status && filter.status !== "all") {
      conditions.push(eq(pipelineEntry.status, filter.status as PipelineStatus));
    } else {
      conditions.push(ne(pipelineEntry.status, "withdrawn"));
    }
    if (filter?.source && filter.source !== "all") {
      conditions.push(eq(job.source, filter.source as JobSource));
    }
    if (filter?.startDate) {
      const start = new Date(filter.startDate);
      if (!isNaN(start.getTime())) {
        conditions.push(
          gte(sql`COALESCE(${job.postedAt}, ${pipelineEntry.createdAt})`, start)
        );
      }
    }
    if (filter?.endDate) {
      const end = new Date(filter.endDate);
      if (!isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        conditions.push(
          lte(sql`COALESCE(${job.postedAt}, ${pipelineEntry.createdAt})`, end)
        );
      }
    }
    if (filter?.query && filter.query.trim()) {
      const q = `%${filter.query.trim()}%`;
      conditions.push(
        or(
          ilike(job.title, q),
          ilike(job.company, q),
          ilike(job.description, q),
          ilike(job.location, q)
        )!
      );
    }

    const [res] = await db
      .select({ value: count() })
      .from(pipelineEntry)
      .innerJoin(job, eq(pipelineEntry.jobId, job.id))
      .where(and(...conditions));

    return ok(res?.value ?? 0);
  } catch (error) {
    return err(
      new AppError("DB_ERROR", "Failed to count pipeline entries", error)
    );
  }
}

export async function upsertPipelineEntry(
  userId: string,
  jobId: string,
  status: PipelineStatus = "saved",
  resumeIdUsed?: string
): Promise<Result<PipelineEntrySelect, AppError>> {
  try {
    return await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: pipelineEntry.id, status: pipelineEntry.status })
        .from(pipelineEntry)
        .where(and(eq(pipelineEntry.userId, userId), eq(pipelineEntry.jobId, jobId)))
        .limit(1);

      const [entry] = await tx
        .insert(pipelineEntry)
        .values({
          userId,
          jobId,
          status,
          resumeIdUsed: resumeIdUsed || null,
        })
        .onConflictDoUpdate({
          target: [pipelineEntry.userId, pipelineEntry.jobId],
          set: {
            status,
            resumeIdUsed: resumeIdUsed || sql`${pipelineEntry.resumeIdUsed}`,
            updatedAt: new Date(),
          },
        })
        .returning();

      if (!entry) {
        return err(new AppError("DB_ERROR", "Failed to upsert pipeline entry"));
      }

      // Record status transition only for new entries or when status actually changes
      if (!existing || existing.status !== status) {
        await tx.insert(pipelineStatusHistory).values({
          pipelineEntryId: entry.id,
          status,
        });
      }

      return ok(entry);
    });
  } catch (error) {
    return err(
      new AppError("DB_ERROR", "Failed to upsert pipeline entry", error)
    );
  }
}

export async function updatePipelineStatus(
  id: string,
  userId: string,
  status: PipelineStatus
): Promise<Result<PipelineEntrySelect, AppError>> {
  try {
    return await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(pipelineEntry)
        .set({
          status,
          updatedAt: new Date(),
        })
        .where(and(eq(pipelineEntry.id, id), eq(pipelineEntry.userId, userId)))
        .returning();

      if (!updated) {
        return err(new AppError("NOT_FOUND", `Pipeline entry ${id} not found`));
      }

      // Record status transition history
      await tx.insert(pipelineStatusHistory).values({
        pipelineEntryId: updated.id,
        status,
      });

      return ok(updated);
    });
  } catch (error) {
    return err(
      new AppError("DB_ERROR", `Failed to update status for entry ${id}`, error)
    );
  }
}

export async function deletePipelineEntry(
  id: string,
  userId: string
): Promise<Result<boolean, AppError>> {
  try {
    await db
      .delete(pipelineEntry)
      .where(and(eq(pipelineEntry.id, id), eq(pipelineEntry.userId, userId)));
    return ok(true);
  } catch (error) {
    return err(
      new AppError("DB_ERROR", `Failed to delete pipeline entry ${id}`, error)
    );
  }
}

export async function getPipelineStatusHistory(
  pipelineEntryId: string
): Promise<Result<PipelineStatusHistorySelect[], AppError>> {
  try {
    const history = await db
      .select()
      .from(pipelineStatusHistory)
      .where(eq(pipelineStatusHistory.pipelineEntryId, pipelineEntryId))
      .orderBy(desc(pipelineStatusHistory.changedAt));
    return ok(history);
  } catch (error) {
    return err(
      new AppError("DB_ERROR", "Failed to fetch status history", error)
    );
  }
}
