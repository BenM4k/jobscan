if (typeof window !== "undefined") {
  throw new Error("This module can only be executed on the server.");
}

import { db } from "@/services/db";
import { job, rawJobPayload, pipelineEntry } from "@/services/db/schema";
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
} from "./types";

export function buildUnscopedJobConditions(
  sourceFilter?: string,
  startDate?: string,
  endDate?: string,
  queryFilter?: string
) {
  const conditions = [];
  if (sourceFilter && sourceFilter !== "all") {
    conditions.push(eq(job.source, sourceFilter as JobSource));
  }
  if (startDate) {
    const start = new Date(startDate);
    if (!isNaN(start.getTime())) {
      conditions.push(
        gte(sql`COALESCE(${job.postedAt}, ${job.createdAt})`, start)
      );
    }
  }
  if (endDate) {
    const end = new Date(endDate);
    if (!isNaN(end.getTime())) {
      end.setHours(23, 59, 59, 999);
      conditions.push(
        lte(sql`COALESCE(${job.postedAt}, ${job.createdAt})`, end)
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
        ilike(job.location, q)
      )!
    );
  }
  return conditions;
}

export async function getJobById(
  id: string,
  userId?: string
): Promise<Result<JobSelect, AppError>> {
  try {
    if (userId) {
      // 1. Try finding pipeline entry by entry ID
      const byEntryId = await pipelineDal.getPipelineEntryById(id, userId);
      if (byEntryId.ok) {
        return ok(pipelineEntryToJobSelect(byEntryId.value));
      }

      // 2. Try finding pipeline entry by job ID
      const byJobId = await pipelineDal.getPipelineEntryByUserAndJob(userId, id);
      if (byJobId.ok && byJobId.value) {
        return ok(pipelineEntryToJobSelect(byJobId.value));
      }
    }

    // 3. Fallback to direct job table query
    const [found] = await db
      .select()
      .from(job)
      .where(eq(job.id, id))
      .limit(1);

    if (!found) {
      return err(new AppError("NOT_FOUND", `Job with ID ${id} not found`));
    }

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
  userId?: string
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
      queryFilter
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
      }))
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
  userId?: string
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
      queryFilter
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
  userId: string
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
          eq(job.externalId, externalId)
        )
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
  limit: number = 10
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
      new AppError("DB_ERROR", "Failed vector similarity search", error)
    );
  }
}

export async function searchJobsFullText(
  queryString: string,
  limit: number = 20
): Promise<Result<CanonicalJobSelect[], AppError>> {
  try {
    const rows = await db
      .select()
      .from(job)
      .where(
        sql`description_tsv @@ plainto_tsquery('english', ${queryString})`
      )
      .orderBy(
        sql`ts_rank(description_tsv, plainto_tsquery('english', ${queryString})) DESC`
      )
      .limit(limit);

    return ok(rows);
  } catch (error) {
    return err(
      new AppError("DB_ERROR", "Failed full-text search", error)
    );
  }
}

export async function getRawJobPayload(
  source: JobSource,
  externalId: string
): Promise<Result<RawJobPayloadSelect, AppError>> {
  try {
    const [row] = await db
      .select()
      .from(rawJobPayload)
      .where(
        and(
          eq(rawJobPayload.source, source),
          eq(rawJobPayload.externalId, externalId)
        )
      )
      .limit(1);

    if (!row) {
      return err(
        new AppError(
          "NOT_FOUND",
          `Raw job payload for ${source}:${externalId} not found`
        )
      );
    }

    return ok(row);
  } catch (error) {
    return err(
      new AppError(
        "DB_ERROR",
        `Failed to retrieve raw job payload for ${source}:${externalId}`,
        error
      )
    );
  }
}

export async function getRawJobPayloadById(
  id: string
): Promise<Result<RawJobPayloadSelect, AppError>> {
  try {
    const [row] = await db
      .select()
      .from(rawJobPayload)
      .where(eq(rawJobPayload.id, id))
      .limit(1);

    if (!row) {
      return err(
        new AppError("NOT_FOUND", `Raw job payload with ID ${id} not found`)
      );
    }

    return ok(row);
  } catch (error) {
    return err(
      new AppError(
        "DB_ERROR",
        `Failed to retrieve raw job payload with ID ${id}`,
        error
      )
    );
  }
}

/**
 * Queries for an existing canonical job with SimHash within the specified Hamming distance threshold.
 * Uses PostgreSQL bitwise XOR (#) and popcount (bit_count) on 64-bit bit strings.
 */
export async function findJobBySimhash(
  targetSimhash: string | bigint,
  maxDistance: number = 3
): Promise<Result<CanonicalJobSelect | null, AppError>> {
  try {
    const targetBigIntStr =
      typeof targetSimhash === "bigint"
        ? targetSimhash.toString()
        : BigInt(targetSimhash).toString();

    const [matched] = await db
      .select()
      .from(job)
      .where(
        and(
          sql`${job.simhash} IS NOT NULL`,
          sql`bit_count((${job.simhash}::bigint # ${sql.raw(targetBigIntStr)}::bigint)::bit(64)) <= ${maxDistance}`
        )
      )
      .orderBy(
        sql`bit_count((${job.simhash}::bigint # ${sql.raw(targetBigIntStr)}::bigint)::bit(64)) ASC`
      )
      .limit(1);

    return ok(matched || null);
  } catch (error) {
    return err(
      new AppError("DB_ERROR", "Failed to query job by simhash", error)
    );
  }
}

