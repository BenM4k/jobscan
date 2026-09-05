import "server-only";

import { db } from "@/services/db";
import {
  job,
  rawJobPayload,
  jobSourceRef,
  pipelineEntry,
  pipelineStatusHistory,
  score,
} from "@/services/db/schema";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";
import { eq, and, sql, or } from "drizzle-orm";
import { isOlderThanOneMonth } from "@/lib/date-utils";
import * as pipelineDal from "@/dal/pipeline.dal";
import * as tailoringDal from "@/dal/tailoring.dal";
import type { TailoredResumeData } from "@/lib/ai";
import {
  CanonicalJobSelect,
  JobInsert,
  JobSelect,
  JobSource,
  JobStatus,
  RawJobPayloadSelect,
} from "./types";
import { getJobById } from "./queries";

export async function upsertCanonicalJob(
  data: JobInsert,
  location: string | null
): Promise<CanonicalJobSelect | null> {
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
      simhash: data.simhash ? sql`${data.simhash}::numeric` : null,
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
        simhash: data.simhash
          ? sql`${data.simhash}::numeric`
          : sql`${job.simhash}`,
        updatedAt: new Date(),
      },
    })
    .returning();
  return canonical || null;
}

export interface CanonicalSimhashResult {
  isDuplicate: boolean;
  canonicalJob: CanonicalJobSelect;
}

/**
 * Serializes similarity recheck and canonical insertion in one atomic transaction with an advisory lock
 * to prevent concurrent cross-source near-duplicates from creating separate canonical jobs.
 */
export async function upsertCanonicalJobWithSimhashDedup(
  data: JobInsert,
  simhashBigInt: bigint | string,
  maxDistance: number = 3
): Promise<Result<CanonicalSimhashResult, AppError>> {
  try {
    const targetBigIntStr =
      typeof simhashBigInt === "bigint"
        ? simhashBigInt.toString()
        : BigInt(simhashBigInt).toString();

    const locationParts = [data.city, data.country].filter(Boolean);
    const location =
      locationParts.length > 0 ? locationParts.join(", ") : data.city || null;

    const res = await db.transaction(async (tx) => {
      // Advisory transaction lock serialized per Postgres connection
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('simhash_job_dedup_lock'))`);

      // 1. Recheck for near-duplicate within transaction
      const [matched] = await tx
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

      if (matched) {
        return { isDuplicate: true, canonicalJob: matched };
      }

      // 2. Insert or update canonical job on (source, externalId)
      const [canonical] = await tx
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
          simhash: data.simhash ? sql`${data.simhash}::numeric` : null,
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
            simhash: data.simhash
              ? sql`${data.simhash}::numeric`
              : sql`${job.simhash}`,
            updatedAt: new Date(),
          },
        })
        .returning();

      return { isDuplicate: false, canonicalJob: canonical };
    });

    return ok(res);
  } catch (error) {
    return err(
      new AppError("DB_ERROR", "Failed in serialized simhash dedup upsert", error)
    );
  }
}

export async function upsertUserPipelineEntry(
  userId: string,
  canonicalJobId: string,
  status: JobStatus = "saved",
  isRestore: boolean = false
): Promise<{ id: string; status: JobStatus } | null> {
  const pStatus =
    status === "applied" ||
    status === "interviewing" ||
    status === "offer" ||
    status === "rejected" ||
    status === "withdrawn"
      ? status
      : "saved";

  const [entry] = await db
    .insert(pipelineEntry)
    .values({
      userId,
      jobId: canonicalJobId,
      status: pStatus,
    })
    .onConflictDoUpdate({
      target: [pipelineEntry.userId, pipelineEntry.jobId],
      set: {
        updatedAt: new Date(),
        ...(isRestore ? { status: pStatus } : {}),
      },
    })
    .returning();

  if (!entry) return null;
  return { id: entry.id, status: entry.status as JobStatus };
}

export async function upsertJob(
  data: JobInsert,
  isRestore: boolean = false
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

    const canonical = await upsertCanonicalJob(data, location);
    if (!canonical) {
      return err(new AppError("DB_ERROR", "Failed to upsert canonical job"));
    }

    let pipelineId = canonical.id;
    let entryStatus: JobStatus = (data.status as JobStatus) || "saved";
    if (data.userId) {
      const entry = await upsertUserPipelineEntry(
        data.userId,
        canonical.id,
        (data.status as JobStatus) || "saved",
        isRestore
      );
      if (entry) {
        pipelineId = entry.id;
        entryStatus = entry.status;
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

export async function restoreJob(
  data: JobInsert
): Promise<Result<JobSelect, AppError>> {
  const restoreStatus =
    data.status && data.status !== "withdrawn" ? data.status : "saved";
  return await upsertJob({ ...data, status: restoreStatus }, true);
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
  resumeVersion?: number,
  userId?: string
): Promise<Result<JobSelect, AppError>> {
  try {
    const entryConditions = [
      or(eq(pipelineEntry.id, id), eq(pipelineEntry.jobId, id)),
    ];
    if (userId) {
      entryConditions.push(eq(pipelineEntry.userId, userId));
    }

    const [entry] = await db
      .select()
      .from(pipelineEntry)
      .where(and(...entryConditions))
      .limit(1);

    if (!entry) {
      return err(
        new AppError("NOT_FOUND", `Pipeline entry for job ${id} not found`)
      );
    }

    const pipelineEntryId = entry.id;

    // Atomic append into score to preserve scoring history
    await db.insert(score).values({
      pipelineEntryId,
      resumeVersion: resumeVersion ?? 1,
      modelUsed: modelUsed ?? "gemini",
      finalScore: fitScore.toString(),
      matchedSkills: matchedSkills ?? [],
      missingSkills: missingSkills ?? [],
      explanation: scoreReasoning,
    });

    if (coverLetterDraft) {
      const clRes = await tailoringDal.saveTailoredCoverLetter(
        pipelineEntryId,
        coverLetterDraft
      );
      if (!clRes.ok) {
        return err(clRes.error);
      }
    }

    if (tailoredResumeText) {
      const resumeRes = await tailoringDal.saveTailoredResume(
        pipelineEntryId,
        tailoredResumeText
      );
      if (!resumeRes.ok) {
        return err(resumeRes.error);
      }
    }

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
  },
  userId?: string
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
    scoreData.resumeVersion,
    userId
  );
}

export async function updateJobTailoredResume(
  id: string,
  tailoredResumeText: string,
  _tailoredResumeData?: TailoredResumeData | null,
  userId?: string
): Promise<Result<JobSelect, AppError>> {
  try {
    const entryConditions = [
      or(eq(pipelineEntry.id, id), eq(pipelineEntry.jobId, id)),
    ];
    if (userId) {
      entryConditions.push(eq(pipelineEntry.userId, userId));
    }

    const [entry] = await db
      .select()
      .from(pipelineEntry)
      .where(and(...entryConditions))
      .limit(1);

    if (!entry) {
      return err(
        new AppError("NOT_FOUND", `Pipeline entry for job ${id} not found`)
      );
    }

    const saveRes = await tailoringDal.saveTailoredResume(
      entry.id,
      tailoredResumeText
    );
    if (!saveRes.ok) {
      return err(saveRes.error);
    }

    await db
      .update(pipelineEntry)
      .set({ updatedAt: new Date() })
      .where(eq(pipelineEntry.id, entry.id));

    return await getJobById(entry.id, entry.userId);
  } catch (error) {
    return err(
      new AppError(
        "DB_ERROR",
        `Failed to update tailored resume for job ${id}`,
        error
      )
    );
  }
}

export async function updateJobCoverLetter(
  id: string,
  userId: string,
  coverLetterDraft: string
): Promise<Result<JobSelect, AppError>> {
  try {
    const [entry] = await db
      .select()
      .from(pipelineEntry)
      .where(
        and(
          eq(pipelineEntry.userId, userId),
          or(eq(pipelineEntry.id, id), eq(pipelineEntry.jobId, id))
        )
      )
      .limit(1);

    if (!entry) {
      return err(
        new AppError("NOT_FOUND", `Pipeline entry for job ${id} not found`)
      );
    }

    const saveRes = await tailoringDal.saveTailoredCoverLetter(
      entry.id,
      coverLetterDraft
    );
    if (!saveRes.ok) {
      return err(saveRes.error);
    }

    await db
      .update(pipelineEntry)
      .set({ updatedAt: new Date() })
      .where(eq(pipelineEntry.id, entry.id));

    return await getJobById(entry.id, userId);
  } catch (error) {
    return err(
      new AppError(
        "DB_ERROR",
        `Failed to update cover letter for job ${id}`,
        error
      )
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

export async function updateRawJobPayloadNormalizedJob(
  id: string,
  normalizedJobId: string
): Promise<Result<void, AppError>> {
  try {
    await db
      .update(rawJobPayload)
      .set({
        normalizedJobId,
        updatedAt: new Date(),
      })
      .where(eq(rawJobPayload.id, id));

    return ok(undefined);
  } catch (error) {
    return err(
      new AppError(
        "DB_ERROR",
        `Failed to link normalized job ${normalizedJobId} to raw job payload ${id}`,
        error
      )
    );
  }
}

export async function setRawJobPayloadNormalizedJob(
  source: JobSource,
  externalId: string,
  normalizedJobId: string
): Promise<Result<void, AppError>> {
  try {
    await db
      .update(rawJobPayload)
      .set({
        normalizedJobId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(rawJobPayload.source, source),
          eq(rawJobPayload.externalId, externalId)
        )
      );

    return ok(undefined);
  } catch (error) {
    return err(
      new AppError(
        "DB_ERROR",
        `Failed to link normalized job ${normalizedJobId} to raw job payload ${source}:${externalId}`,
        error
      )
    );
  }
}
