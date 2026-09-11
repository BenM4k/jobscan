import "server-only";

import { db } from "@/services/db";
import {
  job,
  rawJobPayload,
  pipelineEntry,
  masterResume,
  jobSourceRef,
} from "@/services/db/schema";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";
import { eq, and, desc, sql, or, ilike, count, gte, lte } from "drizzle-orm";
import * as pipelineDal from "@/dal/pipeline.dal";
import {
  JobSelect,
  CanonicalJobSelect,
  JobSource,
  RawJobPayloadSelect,
  pipelineEntryToJobSelect,
  JobWithSimilarity,
} from "./types";

export function buildUnscopedJobConditions(
  sourceFilter?: string,
  startDate?: string,
  endDate?: string,
  queryFilter?: string,
) {
  const conditions = [];
  if (sourceFilter && sourceFilter !== "all") {
    conditions.push(eq(job.source, sourceFilter as JobSource));
  }
  if (startDate) {
    const start = new Date(startDate);
    if (!isNaN(start.getTime())) {
      conditions.push(
        gte(sql`COALESCE(${job.postedAt}, ${job.createdAt})`, start),
      );
    }
  }
  if (endDate) {
    const end = new Date(endDate);
    if (!isNaN(end.getTime())) {
      end.setHours(23, 59, 59, 999);
      conditions.push(
        lte(sql`COALESCE(${job.postedAt}, ${job.createdAt})`, end),
      );
    }
  }
  if (queryFilter && queryFilter.trim()) {
    const q = `%${queryFilter.trim()}%`;
    conditions.push(
      or(
        ilike(job.title, q),
        ilike(job.company, q),
        ilike(job.description, q),
        ilike(job.location, q),
      )!,
    );
  }
  return conditions;
}

export async function getJobById(
  id: string,
  userId?: string,
): Promise<Result<JobSelect, AppError>> {
  try {
    if (userId) {
      // 1. Try finding pipeline entry by entry ID
      const byEntryId = await pipelineDal.getPipelineEntryById(id, userId);
      if (byEntryId.ok) {
        return ok(pipelineEntryToJobSelect(byEntryId.value));
      }

      // 2. Try finding pipeline entry by job ID
      const byJobId = await pipelineDal.getPipelineEntryByUserAndJob(
        userId,
        id,
      );
      if (byJobId.ok && byJobId.value) {
        return ok(pipelineEntryToJobSelect(byJobId.value));
      }
    }

    // 3. Fallback to direct job table query
    const [found] = await db.select().from(job).where(eq(job.id, id)).limit(1);

    if (!found) {
      return err(new AppError("NOT_FOUND", `Job with ID ${id} not found`));
    }

    const refs = await db
      .select({ source: jobSourceRef.source })
      .from(jobSourceRef)
      .where(eq(jobSourceRef.jobId, found.id));

    const alsoPostedOn = refs
      .map((r) => r.source)
      .filter((s) => s !== found.source);

    return ok({
      id: found.id,
      userId: userId || "",
      source: found.source,
      externalId: found.externalId || "",
      title: found.title,
      company: found.company,
      url: found.url || "",
      description: found.description,
      postedAt: found.postedAt,
      country: null,
      countryCode: null,
      city: found.location,
      workplaceType: null,
      remoteRegions: null,
      fitScore: null,
      scoreReasoning: null,
      matchedSkills: [],
      missingSkills: [],
      gaps: [],
      coverLetterDraft: null,
      tailoredResume: null,
      tailoredResumeData: null,
      status: found.status,
      createdAt: found.createdAt,
      updatedAt: found.updatedAt,
      alsoPostedOn,
    });
  } catch (error) {
    return err(new AppError("DB_ERROR", `Failed to get job ${id}`, error));
  }
}

export async function listJobs(
  statusFilter?: pipelineDal.PipelineStatus | "all" | string,
  sourceFilter?: string,
  limit: number = 20,
  offset: number = 0,
  startDate?: string,
  endDate?: string,
  queryFilter?: string,
  userId?: string,
): Promise<Result<JobSelect[], AppError>> {
  try {
    if (userId) {
      const pEntries = await pipelineDal.listPipelineEntries(userId, {
        status: statusFilter as pipelineDal.PipelineStatus | "all" | undefined,
        source: sourceFilter,
        startDate,
        endDate,
        query: queryFilter,
        limit,
        offset,
      });

      if (!pEntries.ok) return err(pEntries.error);
      return ok(pEntries.value.map(pipelineEntryToJobSelect));
    }

    // Unscoped global catalog listing
    const conditions = buildUnscopedJobConditions(
      sourceFilter,
      startDate,
      endDate,
      queryFilter,
    );

    const rows = await db
      .select()
      .from(job)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(job.postedAt), desc(job.createdAt))
      .limit(limit)
      .offset(offset);

    return ok(
      rows.map((j) => ({
        id: j.id,
        userId: "",
        source: j.source,
        externalId: j.externalId || "",
        title: j.title,
        company: j.company,
        url: j.url || "",
        description: j.description,
        postedAt: j.postedAt,
        country: null,
        countryCode: null,
        city: j.location,
        workplaceType: null,
        remoteRegions: null,
        fitScore: null,
        scoreReasoning: null,
        matchedSkills: [],
        missingSkills: [],
        gaps: [],
        coverLetterDraft: null,
        tailoredResume: null,
        tailoredResumeData: null,
        status: j.status,
        createdAt: j.createdAt,
        updatedAt: j.updatedAt,
      })),
    );
  } catch (error) {
    return err(new AppError("DB_ERROR", "Failed to list jobs", error));
  }
}

export async function countJobs(
  statusFilter?: pipelineDal.PipelineStatus | "all" | string,
  sourceFilter?: string,
  startDate?: string,
  endDate?: string,
  queryFilter?: string,
  userId?: string,
): Promise<Result<number, AppError>> {
  try {
    if (userId) {
      return await pipelineDal.countPipelineEntries(userId, {
        status: statusFilter as pipelineDal.PipelineStatus | "all" | undefined,
        source: sourceFilter,
        startDate,
        endDate,
        query: queryFilter,
      });
    }

    const conditions = buildUnscopedJobConditions(
      sourceFilter,
      startDate,
      endDate,
      queryFilter,
    );
    const [res] = await db
      .select({ value: count() })
      .from(job)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    return ok(res?.value ?? 0);
  } catch (error) {
    return err(new AppError("DB_ERROR", "Failed to count jobs", error));
  }
}

export async function isJobDeleted(
  source: string,
  externalId: string,
  userId: string,
): Promise<boolean> {
  try {
    const [found] = await db
      .select({ id: pipelineEntry.id, status: pipelineEntry.status })
      .from(pipelineEntry)
      .innerJoin(job, eq(pipelineEntry.jobId, job.id))
      .where(
        and(
          eq(pipelineEntry.userId, userId),
          eq(job.source, source as JobSource),
          eq(job.externalId, externalId),
        ),
      )
      .limit(1);

    if (found && found.status === "withdrawn") {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export async function searchJobsByVector(
  embedding: number[],
  limit: number = 10,
): Promise<Result<CanonicalJobSelect[], AppError>> {
  try {
    const vectorLiteral = `[${embedding.join(",")}]`;
    const rows = await db
      .select()
      .from(job)
      .where(sql`${job.embedding} IS NOT NULL`)
      .orderBy(sql`${job.embedding} <=> ${vectorLiteral}::vector`)
      .limit(limit);

    return ok(rows);
  } catch (error) {
    return err(
      new AppError("DB_ERROR", "Failed vector similarity search", error),
    );
  }
}

/**
 * Query jobs ordered by cosine distance using pgvector's <=> operator,
 * returning each job with its calculated cosine similarity (1 - distance).
 */
export async function searchJobsByCosineSimilarity(
  embedding: number[],
  options: { limit?: number; minSimilarity?: number } = {},
): Promise<Result<JobWithSimilarity[], AppError>> {
  try {
    const limit = options.limit ?? 10;
    const vectorLiteral = `[${embedding.join(",")}]`;
    const distanceExpr = sql<number>`${job.embedding} <=> ${vectorLiteral}::vector`;
    const similarityExpr = sql<number>`1 - (${job.embedding} <=> ${vectorLiteral}::vector)`;

    const conditions = [sql`${job.embedding} IS NOT NULL`];
    if (options.minSimilarity !== undefined) {
      conditions.push(
        sql`(1 - (${job.embedding} <=> ${vectorLiteral}::vector)) >= ${options.minSimilarity}`,
      );
    }

    const rows = await db
      .select({
        job,
        similarity: similarityExpr,
      })
      .from(job)
      .where(and(...conditions))
      .orderBy(distanceExpr)
      .limit(limit);

    return ok(
      rows.map((r) => ({
        ...r.job,
        similarity: Number(r.similarity),
      })),
    );
  } catch (error) {
    return err(
      new AppError("DB_ERROR", "Failed cosine similarity search", error),
    );
  }
}

/**
 * Query jobs ranked by cosine similarity using pgvector's <=> operator via raw SQL template.
 */
export async function findJobsRankedBySimilarity(
  embedding: number[],
  limit = 20,
): Promise<Result<JobWithSimilarity[], AppError>> {
  return searchJobsByCosineSimilarity(embedding, { limit });
}

/**
 * Find canonical jobs most similar to a user's master resume using pgvector's <=> operator.
 */
export async function findJobsSimilarToResume(
  resumeId: string,
  options: { limit?: number; minSimilarity?: number } = {},
): Promise<Result<JobWithSimilarity[], AppError>> {
  try {
    const [found] = await db
      .select({ embedding: masterResume.embedding })
      .from(masterResume)
      .where(eq(masterResume.id, resumeId))
      .limit(1);

    if (!found || !found.embedding) {
      return err(
        new AppError(
          "NOT_FOUND",
          `Master resume ${resumeId} has no embedding generated`,
        ),
      );
    }

    return searchJobsByCosineSimilarity(found.embedding, options);
  } catch (error) {
    return err(
      new AppError(
        "DB_ERROR",
        `Failed to find jobs similar to resume ${resumeId}`,
        error,
      ),
    );
  }
}

/**
 * Calculate the exact cosine similarity between a job and a resume directly via pgvector's <=> operator.
 */
export async function getJobResumeSimilarity(
  jobId: string,
  resumeId: string,
): Promise<Result<number | null, AppError>> {
  try {
    const [row] = await db
      .select({
        similarity: sql<number>`1 - (${job.embedding} <=> ${masterResume.embedding})`,
      })
      .from(job)
      .innerJoin(
        masterResume,
        and(
          eq(job.id, jobId),
          eq(masterResume.id, resumeId),
          sql`${job.embedding} IS NOT NULL`,
          sql`${masterResume.embedding} IS NOT NULL`,
        ),
      )
      .limit(1);

    if (!row) {
      return ok(null);
    }

    return ok(Number(row.similarity));
  } catch (error) {
    return err(
      new AppError(
        "DB_ERROR",
        "Failed to compute job-resume cosine similarity",
        error,
      ),
    );
  }
}

export async function searchJobsFullText(
  queryString: string,
  limit: number = 20,
): Promise<Result<CanonicalJobSelect[], AppError>> {
  try {
    const rows = await db
      .select()
      .from(job)
      .where(
        sql`${job.descriptionTsv} @@ plainto_tsquery('english', ${queryString})`,
      )
      .orderBy(
        sql`ts_rank(${job.descriptionTsv}, plainto_tsquery('english', ${queryString}), 32) DESC`,
      )
      .limit(limit);

    return ok(rows);
  } catch (error) {
    return err(new AppError("DB_ERROR", "Failed full-text search", error));
  }
}

/**
 * Calculate ts_rank between a job's description_tsv and a query string (or resume keywords).
 * Uses language-appropriate dictionary ('french' vs 'english') and normalization flag 32.
 */
export async function getJobResumeTsRank(
  jobId: string,
  queryOrKeywords: string,
  language: "en" | "fr" = "en",
): Promise<Result<number | null, AppError>> {
  try {
    if (!queryOrKeywords || !queryOrKeywords.trim()) {
      return ok(0);
    }

    const regconfig = language === "fr" ? "french" : "english";
    const [row] = await db
      .select({
        rank: sql<number>`ts_rank(${job.descriptionTsv}, websearch_to_tsquery(${regconfig}::regconfig, ${queryOrKeywords}), 32)`,
      })
      .from(job)
      .where(eq(job.id, jobId))
      .limit(1);

    if (!row) {
      return ok(null);
    }

    return ok(row.rank != null ? Number(row.rank) : 0);
  } catch (error) {
    return err(
      new AppError(
        "DB_ERROR",
        "Failed to compute job full-text ts_rank",
        error,
      ),
    );
  }
}

/**
 * Query jobs ranked by full-text keyword search matching candidate resume language.
 * Filters WHERE language = resumeLanguage and uses matching text-search config.
 * Cross-language keyword matching is deliberately NOT attempted (embeddings carry that case).
 */
export async function findJobsRankedByKeyword(
  queryOrKeywords: string,
  resumeLanguage: "en" | "fr" = "en",
  limit: number = 20,
): Promise<Result<Array<CanonicalJobSelect & { bm25Rank: number }>, AppError>> {
  try {
    if (!queryOrKeywords || !queryOrKeywords.trim()) {
      return ok([]);
    }

    const regconfig = resumeLanguage === "fr" ? "french" : "english";
    const tsquery = sql`websearch_to_tsquery(${regconfig}::regconfig, ${queryOrKeywords})`;
    const rankExpr = sql<number>`ts_rank(${job.descriptionTsv}, ${tsquery}, 32)`;

    const rows = await db
      .select({
        job,
        rank: rankExpr,
      })
      .from(job)
      .where(
        and(
          eq(job.language, resumeLanguage),
          sql`${job.descriptionTsv} @@ ${tsquery}`,
        )
      )
      .orderBy(desc(rankExpr))
      .limit(limit);

    return ok(
      rows.map((r) => ({
        ...r.job,
        bm25Rank: Number(r.rank),
      }))
    );
  } catch (error) {
    return err(
      new AppError(
        "DB_ERROR",
        "Failed to find jobs ranked by keyword",
        error,
      ),
    );
  }
}

/**
 * Executes both queries (dense cosine similarity and sparse full-text ts_rank) for a job and resume.
 */
export async function getJobHybridScores(
  jobId: string,
  resumeId: string,
  queryOrKeywords: string,
  language: "en" | "fr" = "en",
): Promise<
  Result<{ cosineSimilarity: number | null; bm25Rank: number | null }, AppError>
> {
  try {
    const [cosineRes, bm25Res] = await Promise.all([
      getJobResumeSimilarity(jobId, resumeId),
      getJobResumeTsRank(jobId, queryOrKeywords, language),
    ]);

    if (!cosineRes.ok) return cosineRes;
    if (!bm25Res.ok) return bm25Res;

    return ok({
      cosineSimilarity: cosineRes.value,
      bm25Rank: bm25Res.value,
    });
  } catch (error) {
    return err(
      new AppError("DB_ERROR", "Failed to compute job hybrid scores", error),
    );
  }
}

export async function getRawJobPayload(
  source: JobSource,
  externalId: string,
): Promise<Result<RawJobPayloadSelect, AppError>> {
  try {
    const [row] = await db
      .select()
      .from(rawJobPayload)
      .where(
        and(
          eq(rawJobPayload.source, source),
          eq(rawJobPayload.externalId, externalId),
        ),
      )
      .limit(1);

    if (!row) {
      return err(
        new AppError(
          "NOT_FOUND",
          `Raw job payload for ${source}:${externalId} not found`,
        ),
      );
    }

    return ok(row);
  } catch (error) {
    return err(
      new AppError(
        "DB_ERROR",
        `Failed to retrieve raw job payload for ${source}:${externalId}`,
        error,
      ),
    );
  }
}

export async function getRawJobPayloadById(
  id: string,
): Promise<Result<RawJobPayloadSelect, AppError>> {
  try {
    const [row] = await db
      .select()
      .from(rawJobPayload)
      .where(eq(rawJobPayload.id, id))
      .limit(1);

    if (!row) {
      return err(
        new AppError("NOT_FOUND", `Raw job payload with ID ${id} not found`),
      );
    }

    return ok(row);
  } catch (error) {
    return err(
      new AppError(
        "DB_ERROR",
        `Failed to retrieve raw job payload with ID ${id}`,
        error,
      ),
    );
  }
}

/**
 * Queries for an existing canonical job with SimHash within the specified Hamming distance threshold
 * within a lookback period (default 30 days).
 * Uses PostgreSQL bitwise XOR (#) and popcount (bit_count) on 64-bit bit strings.
 */
export async function findJobBySimhash(
  targetSimhash: string | bigint,
  maxDistance: number = 4,
  lookbackDays: number = 30,
  excludeJobId?: string,
): Promise<Result<CanonicalJobSelect | null, AppError>> {
  try {
    const targetBigIntStr =
      typeof targetSimhash === "bigint"
        ? targetSimhash.toString()
        : BigInt(targetSimhash).toString();

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - lookbackDays);

    const conditions = [
      sql`${job.simhash} IS NOT NULL`,
      sql`bit_count((${job.simhash}::bigint # ${sql.raw(targetBigIntStr)}::bigint)::bit(64)) <= ${maxDistance}`,
      or(
        gte(job.postedAt, cutoff),
        and(sql`${job.postedAt} IS NULL`, gte(job.createdAt, cutoff)),
      )!,
    ];

    if (excludeJobId) {
      conditions.push(sql`${job.id} != ${excludeJobId}`);
    }

    const [matched] = await db
      .select()
      .from(job)
      .where(and(...conditions))
      .orderBy(
        sql`bit_count((${job.simhash}::bigint # ${sql.raw(targetBigIntStr)}::bigint)::bit(64)) ASC`,
      )
      .limit(1);

    return ok(matched || null);
  } catch (error) {
    return err(
      new AppError("DB_ERROR", "Failed to query job by simhash", error),
    );
  }
}

export async function getCanonicalJobBySourceAndExternalId(
  source: JobSource,
  externalId: string,
): Promise<Result<CanonicalJobSelect | null, AppError>> {
  try {
    const [found] = await db
      .select()
      .from(job)
      .where(and(eq(job.source, source), eq(job.externalId, externalId)))
      .limit(1);
    return ok(found || null);
  } catch (error) {
    return err(
      new AppError(
        "DB_ERROR",
        `Failed to get job by source ${source} and externalId ${externalId}`,
        error,
      ),
    );
  }
}

export async function getJobSourceRefBySourceAndExternalId(
  source: JobSource,
  externalId: string,
): Promise<Result<typeof jobSourceRef.$inferSelect | null, AppError>> {
  try {
    const [found] = await db
      .select()
      .from(jobSourceRef)
      .where(
        and(
          eq(jobSourceRef.source, source),
          eq(jobSourceRef.externalId, externalId),
        ),
      )
      .limit(1);
    return ok(found || null);
  } catch (error) {
    return err(
      new AppError(
        "DB_ERROR",
        `Failed to get job source ref for ${source}:${externalId}`,
        error,
      ),
    );
  }
}

export async function getJobSourceRefsForJob(
  jobId: string,
): Promise<Result<Array<typeof jobSourceRef.$inferSelect>, AppError>> {
  try {
    const refs = await db
      .select()
      .from(jobSourceRef)
      .where(eq(jobSourceRef.jobId, jobId));
    return ok(refs);
  } catch (error) {
    return err(
      new AppError(
        "DB_ERROR",
        `Failed to get job source refs for job ${jobId}`,
        error,
      ),
    );
  }
}

export async function getCanonicalJobRowById(
  id: string,
): Promise<Result<CanonicalJobSelect | null, AppError>> {
  try {
    const [found] = await db.select().from(job).where(eq(job.id, id)).limit(1);
    return ok(found || null);
  } catch (error) {
    return err(
      new AppError("DB_ERROR", `Failed to get canonical job ${id}`, error),
    );
  }
}
