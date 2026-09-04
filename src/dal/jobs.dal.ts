if (typeof window !== "undefined") {
  throw new Error("This module can only be executed on the server.");
}
import { db } from "@/services/db";
import {
  job,
  rawJobPayload,
  jobSourceRef,
  jobSourceEnum,
  jobStatusEnum,
  pipelineEntry,
  pipelineStatusHistory,
  score,
} from "@/services/db/schema";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";
import { eq, and, desc, sql, or, ilike, count, gte, lte } from "drizzle-orm";
import { isOlderThanOneMonth } from "@/lib/date-utils";
import * as pipelineDal from "./pipeline.dal";
import * as tailoringDal from "./tailoring.dal";
import type { TailoredResumeData } from "@/lib/ai";

export type CanonicalJobInsert = typeof job.$inferInsert;
export type CanonicalJobSelect = typeof job.$inferSelect;
export type RawJobPayloadSelect = typeof rawJobPayload.$inferSelect;
export type JobSource = (typeof jobSourceEnum.enumValues)[number];
export type JobStatus = (typeof jobStatusEnum.enumValues)[number] | string;

export interface JobSelect {
  id: string;
  userId: string;
  source: string;
  externalId: string;
  title: string;
  company: string;
  url: string;
  description: string | null;
  postedAt: Date | null;
  country?: string | null;
  countryCode?: string | null;
  city?: string | null;
  workplaceType?: string | null;
  remoteRegions?: string[] | null;
  fitScore: number | null;
  scoreReasoning: string | null;
  matchedSkills: string[] | null;
  missingSkills: string[] | null;
  gaps: string[] | null;
  coverLetterDraft: string | null;
  tailoredResume: string | null;
  tailoredResumeData: TailoredResumeData | null;
  status: JobStatus;
  createdAt: Date;
  updatedAt?: Date;
  embedding?: number[] | null;
}

export type JobInsert = Partial<JobSelect> & {
  title: string;
  company: string;
  source: JobSource | string;
  externalId?: string;
  userId?: string;
};

export function pipelineEntryToJobSelect(
  entry: pipelineDal.PipelineEntryWithDetails
): JobSelect {
  return {
    id: entry.id,
    userId: entry.userId,
    source: entry.job.source,
    externalId: entry.job.externalId || "",
    title: entry.job.title,
    company: entry.job.company,
    url: entry.job.url || "",
    description: entry.job.description,
    postedAt: entry.job.postedAt,
    country: null,
    countryCode: null,
    city: entry.job.location,
    workplaceType: null,
    remoteRegions: null,
    fitScore: entry.score?.finalScore
      ? Math.round(Number(entry.score.finalScore))
      : null,
    scoreReasoning: entry.score?.explanation || null,
    matchedSkills: (entry.score?.matchedSkills as string[]) || [],
    missingSkills: (entry.score?.missingSkills as string[]) || [],
    gaps: [],
    coverLetterDraft: entry.tailoredCoverLetter?.content || null,
    tailoredResume: entry.tailoredResume?.content || null,
    tailoredResumeData: null,
    status: entry.status,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

// ─────────────────────────────────────────────────────────────
// Upsert Job (Canonical Catalog + User Pipeline Entry)
// ─────────────────────────────────────────────────────────────

export async function upsertJob(
  data: JobInsert
): Promise<Result<JobSelect, AppError>> {
  try {
    if (data.postedAt && isOlderThanOneMonth(data.postedAt)) {
      return err(
        new AppError(
          "EXPIRED_JOB",
          `Job posting "${data.title}" is older than 1 month and was skipped.`
        )
      );
    }

    const locationParts = [data.city, data.country].filter(Boolean);
    const location =
      locationParts.length > 0 ? locationParts.join(", ") : data.city || null;

    const [canonical] = await db
      .insert(job)
      .values({
        source: data.source as JobSource,
        externalId: data.externalId || null,
        title: data.title,
        company: data.company,
        url: data.url || null,
        description: data.description || "",
        postedAt: data.postedAt || null,
        location,
        status: "active",
        addedByUserId: data.source === "manual" ? data.userId || null : null,
      })
      .onConflictDoUpdate({
        target: [job.source, job.externalId],
        set: {
          title: data.title,
          company: data.company,
          url: data.url || null,
          description: data.description || "",
          postedAt: data.postedAt || null,
          location,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!canonical) {
      return err(new AppError("DB_ERROR", "Failed to upsert canonical job"));
    }

    let pipelineId = canonical.id;
    let entryStatus: JobStatus = (data.status as JobStatus) || "saved";
    if (data.userId) {
      const pStatus =
        data.status === "applied" ||
        data.status === "interviewing" ||
        data.status === "offer" ||
        data.status === "rejected" ||
        data.status === "withdrawn"
          ? data.status
          : "saved";

      const [entry] = await db
        .insert(pipelineEntry)
        .values({
          userId: data.userId,
          jobId: canonical.id,
          status: pStatus,
        })
        .onConflictDoUpdate({
          target: [pipelineEntry.userId, pipelineEntry.jobId],
          set: {
            updatedAt: new Date(),
          },
        })
        .returning();

      if (entry) {
        pipelineId = entry.id;
        entryStatus = entry.status as JobStatus;
      }
    }

    return ok({
      id: pipelineId,
      userId: data.userId || "",
      source: canonical.source,
      externalId: canonical.externalId || "",
      title: canonical.title,
      company: canonical.company,
      url: canonical.url || "",
      description: canonical.description,
      postedAt: canonical.postedAt,
      country: data.country || null,
      countryCode: data.countryCode || null,
      city: data.city || canonical.location || null,
      workplaceType: data.workplaceType || null,
      remoteRegions: data.remoteRegions || null,
      fitScore: data.fitScore || null,
      scoreReasoning: data.scoreReasoning || null,
      matchedSkills: data.matchedSkills || [],
      missingSkills: data.missingSkills || [],
      gaps: data.gaps || [],
      coverLetterDraft: data.coverLetterDraft || null,
      tailoredResume: data.tailoredResume || null,
      tailoredResumeData: data.tailoredResumeData || null,
      status: entryStatus,
      createdAt: canonical.createdAt,
      updatedAt: canonical.updatedAt,
    });
  } catch (error) {
    return err(
      new AppError("DB_ERROR", "Failed to upsert job in database", error)
    );
  }
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

function buildUnscopedJobConditions(
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

export async function updateJobStatus(
  id: string,
  status: pipelineDal.PipelineStatus | string
): Promise<Result<JobSelect, AppError>> {
  try {
    const pStatus =
      status === "applied" ||
      status === "interviewing" ||
      status === "offer" ||
      status === "rejected" ||
      status === "withdrawn"
        ? status
        : "saved";

    const [updatedEntry] = await db
      .update(pipelineEntry)
      .set({
        status: pStatus,
        updatedAt: new Date(),
      })
      .where(eq(pipelineEntry.id, id))
      .returning();

    if (updatedEntry) {
      await db.insert(pipelineStatusHistory).values({
        pipelineEntryId: updatedEntry.id,
        status: pStatus,
      });
      return await getJobById(updatedEntry.id, updatedEntry.userId);
    }

    return await getJobById(id);
  } catch (error) {
    return err(
      new AppError("DB_ERROR", `Failed to update status for job ${id}`, error)
    );
  }
}

export async function updateJobScoreAndCoverLetter(
  id: string,
  fitScore: number,
  scoreReasoning: string,
  coverLetterDraft: string,
  tailoredResumeText?: string,
  matchedSkills?: string[],
  missingSkills?: string[],
  _gaps?: string[],
  modelUsed?: string,
  resumeVersion?: number
): Promise<Result<JobSelect, AppError>> {
  try {
    // 1. Resolve pipeline entry by entry id or job id
    const [entry] = await db
      .select()
      .from(pipelineEntry)
      .where(or(eq(pipelineEntry.id, id), eq(pipelineEntry.jobId, id)))
      .limit(1);

    if (!entry) {
      return err(new AppError("NOT_FOUND", `Pipeline entry for job ${id} not found`));
    }

    const pipelineEntryId = entry.id;

    // 2. Persist Score snapshot (upsert exactly one current score per pipeline entry)
    const [existingScore] = await db
      .select()
      .from(score)
      .where(eq(score.pipelineEntryId, pipelineEntryId))
      .limit(1);

    if (existingScore) {
      await db
        .update(score)
        .set({
          finalScore: fitScore.toString(),
          explanation: scoreReasoning,
          matchedSkills: matchedSkills ?? [],
          missingSkills: missingSkills ?? [],
          modelUsed: modelUsed ?? existingScore.modelUsed,
          resumeVersion: resumeVersion ?? existingScore.resumeVersion,
          updatedAt: new Date(),
        })
        .where(eq(score.id, existingScore.id));
    } else {
      await db.insert(score).values({
        pipelineEntryId,
        resumeVersion: resumeVersion ?? 1,
        modelUsed: modelUsed ?? "gemini",
        finalScore: fitScore.toString(),
        matchedSkills: matchedSkills ?? [],
        missingSkills: missingSkills ?? [],
        explanation: scoreReasoning,
      });
    }

    // 3. Persist Cover Letter
    if (coverLetterDraft) {
      await tailoringDal.saveTailoredCoverLetter(pipelineEntryId, coverLetterDraft);
    }

    // 4. Persist Tailored Resume if provided
    if (tailoredResumeText) {
      await tailoringDal.saveTailoredResume(pipelineEntryId, tailoredResumeText);
    }

    // 5. Update pipeline entry timestamp
    await db
      .update(pipelineEntry)
      .set({ updatedAt: new Date() })
      .where(eq(pipelineEntry.id, pipelineEntryId));

    return await getJobById(pipelineEntryId, entry.userId);
  } catch (error) {
    return err(
      new AppError("DB_ERROR", `Failed to update score for job ${id}`, error)
    );
  }
}

export async function updateJobScoreBreakdown(
  id: string,
  scoreData: {
    overallScore: number;
    matchedSkills: string[];
    missingSkills: string[];
    gaps: string[];
    reasoning: string;
    modelUsed?: string;
    resumeVersion?: number;
  }
): Promise<Result<JobSelect, AppError>> {
  return await updateJobScoreAndCoverLetter(
    id,
    scoreData.overallScore,
    scoreData.reasoning,
    "",
    undefined,
    scoreData.matchedSkills,
    scoreData.missingSkills,
    scoreData.gaps,
    scoreData.modelUsed,
    scoreData.resumeVersion
  );
}

export async function updateJobTailoredResume(
  id: string,
  tailoredResumeText: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tailoredResumeData?: TailoredResumeData | null
): Promise<Result<JobSelect, AppError>> {
  try {
    await tailoringDal.saveTailoredResume(id, tailoredResumeText);

    const [entry] = await db
      .select()
      .from(pipelineEntry)
      .where(eq(pipelineEntry.id, id))
      .limit(1);

    return await getJobById(id, entry?.userId);
  } catch (error) {
    return err(
      new AppError("DB_ERROR", `Failed to update tailored resume for job ${id}`, error)
    );
  }
}

export async function updateJobCoverLetter(
  id: string,
  userId: string,
  coverLetterDraft: string
): Promise<Result<JobSelect, AppError>> {
  try {
    await tailoringDal.saveTailoredCoverLetter(id, coverLetterDraft);
    return await getJobById(id, userId);
  } catch (error) {
    return err(
      new AppError("DB_ERROR", `Failed to update cover letter for job ${id}`, error)
    );
  }
}

export async function deleteJob(
  id: string,
  userId: string
): Promise<Result<boolean, AppError>> {
  try {
    const updateRes = await pipelineDal.updatePipelineStatus(id, userId, "withdrawn");
    if (updateRes.ok) {
      return ok(true);
    }
    // Also try resolving if id is a canonical jobId
    const [byJob] = await db
      .select({ id: pipelineEntry.id })
      .from(pipelineEntry)
      .where(and(eq(pipelineEntry.jobId, id), eq(pipelineEntry.userId, userId)))
      .limit(1);
    if (byJob) {
      const updateByJobRes = await pipelineDal.updatePipelineStatus(byJob.id, userId, "withdrawn");
      if (updateByJobRes.ok) {
        return ok(true);
      }
    }
    return err(updateRes.error);
  } catch (error) {
    return err(new AppError("DB_ERROR", `Failed to delete job ${id}`, error));
  }
}

export async function isJobDeleted(
  source: string,
  externalId: string,
  userId: string
): Promise<boolean> {
  try {
    // Check if canonical job exists and user has deleted/withdrawn entry
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

export async function restoreJob(
  data: JobInsert
): Promise<Result<JobSelect, AppError>> {
  return await upsertJob(data);
}

// ─────────────────────────────────────────────────────────────
// Raw Ingestion & Deduplication
// ─────────────────────────────────────────────────────────────

export async function insertRawJobPayload(
  source: JobSource,
  externalId: string,
  payload: Record<string, unknown>,
  normalizedJobId?: string
): Promise<Result<RawJobPayloadSelect, AppError>> {
  try {
    const [inserted] = await db
      .insert(rawJobPayload)
      .values({
        source,
        externalId,
        payload,
        normalizedJobId: normalizedJobId || null,
      })
      .onConflictDoUpdate({
        target: [rawJobPayload.source, rawJobPayload.externalId],
        set: {
          payload,
          fetchedAt: new Date(),
          normalizedJobId: normalizedJobId || sql`${rawJobPayload.normalizedJobId}`,
          updatedAt: new Date(),
        },
      })
      .returning();

    return ok(inserted);
  } catch (error) {
    return err(
      new AppError("DB_ERROR", "Failed to record raw job payload", error)
    );
  }
}

export async function linkJobSourceRef(
  jobId: string,
  source: JobSource,
  externalId: string,
  url?: string
): Promise<Result<void, AppError>> {
  try {
    await db
      .insert(jobSourceRef)
      .values({
        jobId,
        source,
        externalId,
        url: url || null,
      })
      .onConflictDoUpdate({
        target: [jobSourceRef.source, jobSourceRef.externalId],
        set: {
          jobId,
          url: url || sql`${jobSourceRef.url}`,
          updatedAt: new Date(),
        },
      });
    return ok(undefined);
  } catch (error) {
    return err(
      new AppError("DB_ERROR", "Failed to link job source ref", error)
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Vector Cosine Similarity & Full-Text Search
// ─────────────────────────────────────────────────────────────

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
