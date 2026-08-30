if (typeof window !== "undefined") {
  throw new Error("This module can only be executed on the server.");
}
import { db } from "@/services/db";
import { jobs, JobStatus } from "@/services/db/schema";
import { ok, err, Result } from "@/lib/result";

import { AppError } from "@/lib/errors";
import { eq, desc, gte, lte, sql, or, and, ilike, count } from "drizzle-orm";
import { isOlderThanOneMonth } from "@/lib/date-utils";
import type { TailoredResumeData } from "@/lib/ai";

export type JobInsert = typeof jobs.$inferInsert;
export type JobSelect = typeof jobs.$inferSelect;

export async function upsertJob(
  data: JobInsert,
): Promise<Result<JobSelect, AppError>> {
  try {
    if (data.postedAt && isOlderThanOneMonth(data.postedAt)) {
      return err(
        new AppError(
          "EXPIRED_JOB",
          `Job posting "${data.title}" is older than 1 month and was skipped.`,
        ),
      );
    }
    const [inserted] = await db
      .insert(jobs)
      .values(data)
      .onConflictDoUpdate({
        target: [jobs.source, jobs.externalId],
        set: {
          title: data.title,
          company: data.company,
          url: data.url,
          description: data.description,
          postedAt: data.postedAt,
          country: data.country,
          countryCode: data.countryCode,
          city: data.city,
          workplaceType: data.workplaceType,
          remoteRegions: data.remoteRegions,
        },
      })
      .returning();

    return ok(inserted);
  } catch (error) {
    return err(
      new AppError("DB_ERROR", "Failed to upsert job in database", error),
    );
  }
}

export async function getJobById(
  id: string,
): Promise<Result<JobSelect, AppError>> {
  try {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    if (!job) {
      return err(new AppError("NOT_FOUND", `Job with ID ${id} not found`));
    }
    return ok(job);
  } catch (error) {
    return err(new AppError("DB_ERROR", `Failed to get job ${id}`, error));
  }
}

export async function listJobs(
  statusFilter?: JobStatus,
  sourceFilter?: string,
  limit: number = 20,
  offset: number = 0,
  startDate?: string,
  endDate?: string,
  queryFilter?: string,
): Promise<Result<JobSelect[], AppError>> {
  try {
    const conditions = [];
    if (statusFilter) {
      conditions.push(eq(jobs.status, statusFilter));
    }
    if (sourceFilter && sourceFilter !== "all") {
      conditions.push(eq(jobs.source, sourceFilter));
    }
    if (startDate) {
      const start = new Date(startDate);
      if (!isNaN(start.getTime())) {
        conditions.push(
          gte(sql`COALESCE(${jobs.postedAt}, ${jobs.createdAt})`, start),
        );
      }
    }
    if (endDate) {
      const end = new Date(endDate);
      if (!isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        conditions.push(
          lte(sql`COALESCE(${jobs.postedAt}, ${jobs.createdAt})`, end),
        );
      }
    }
    if (queryFilter && queryFilter.trim()) {
      const q = `%${queryFilter.trim()}%`;
      conditions.push(
        or(
          ilike(jobs.title, q),
          ilike(jobs.company, q),
          ilike(jobs.description, q),
          ilike(jobs.city, q),
          sql`EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(COALESCE(${jobs.matchedSkills}, '[]'::jsonb)) AS elem
            WHERE elem ILIKE ${q}
          )`,
        ),
      );
    }

    const query = db.select().from(jobs);
    const resultList =
      conditions.length > 0
        ? await query
            .where(
              conditions.length === 1
                ? conditions[0]
                : and(...conditions),
            )
            .orderBy(desc(jobs.postedAt), desc(jobs.createdAt))
            .limit(limit)
            .offset(offset)
        : await query
            .orderBy(desc(jobs.postedAt), desc(jobs.createdAt))
            .limit(limit)
            .offset(offset);

    return ok(resultList);
  } catch (error) {
    return err(new AppError("DB_ERROR", "Failed to list jobs", error));
  }
}

export async function countJobs(
  statusFilter?: JobStatus,
  sourceFilter?: string,
  startDate?: string,
  endDate?: string,
  queryFilter?: string,
): Promise<Result<number, AppError>> {
  try {
    const conditions = [];
    if (statusFilter) {
      conditions.push(eq(jobs.status, statusFilter));
    }
    if (sourceFilter && sourceFilter !== "all") {
      conditions.push(eq(jobs.source, sourceFilter));
    }
    if (startDate) {
      const start = new Date(startDate);
      if (!isNaN(start.getTime())) {
        conditions.push(
          gte(sql`COALESCE(${jobs.postedAt}, ${jobs.createdAt})`, start),
        );
      }
    }
    if (endDate) {
      const end = new Date(endDate);
      if (!isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        conditions.push(
          lte(sql`COALESCE(${jobs.postedAt}, ${jobs.createdAt})`, end),
        );
      }
    }
    if (queryFilter && queryFilter.trim()) {
      const q = `%${queryFilter.trim()}%`;
      conditions.push(
        or(
          ilike(jobs.title, q),
          ilike(jobs.company, q),
          ilike(jobs.description, q),
          ilike(jobs.city, q),
          sql`EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(COALESCE(${jobs.matchedSkills}, '[]'::jsonb)) AS elem
            WHERE elem ILIKE ${q}
          )`,
        ),
      );
    }

    const query = db.select({ value: count() }).from(jobs);
    const [res] =
      conditions.length > 0
        ? await query.where(
            conditions.length === 1
              ? conditions[0]
              : and(...conditions),
          )
        : await query;

    return ok(res?.value ?? 0);
  } catch (error) {
    return err(new AppError("DB_ERROR", "Failed to count jobs", error));
  }
}

export async function updateJobStatus(
  id: string,
  status: JobStatus,
): Promise<Result<JobSelect, AppError>> {
  try {
    const [updated] = await db
      .update(jobs)
      .set({ status })
      .where(eq(jobs.id, id))
      .returning();

    if (!updated) {
      return err(new AppError("NOT_FOUND", `Job with ID ${id} not found`));
    }
    return ok(updated);
  } catch (error) {
    return err(
      new AppError("DB_ERROR", `Failed to update status for job ${id}`, error),
    );
  }
}

export async function updateJobScoreAndCoverLetter(
  id: string,
  fitScore: number,
  scoreReasoning: string,
  coverLetterDraft: string,
  tailoredResume?: string,
  matchedSkills?: string[],
  missingSkills?: string[],
  gaps?: string[],
): Promise<Result<JobSelect, AppError>> {
  try {
    const [updated] = await db
      .update(jobs)
      .set({
        fitScore,
        scoreReasoning,
        coverLetterDraft,
        tailoredResume,
        matchedSkills: matchedSkills || [],
        missingSkills: missingSkills || [],
        gaps: gaps || [],
        status: "scored",
      })
      .where(eq(jobs.id, id))
      .returning();

    if (!updated) {
      return err(new AppError("NOT_FOUND", `Job with ID ${id} not found`));
    }
    return ok(updated);
  } catch (error) {
    return err(
      new AppError("DB_ERROR", `Failed to update score for job ${id}`, error),
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
  },
): Promise<Result<JobSelect, AppError>> {
  try {
    const [updated] = await db
      .update(jobs)
      .set({
        fitScore: scoreData.overallScore,
        scoreReasoning: scoreData.reasoning,
        matchedSkills: scoreData.matchedSkills,
        missingSkills: scoreData.missingSkills,
        gaps: scoreData.gaps,
        status: "scored",
      })
      .where(eq(jobs.id, id))
      .returning();

    if (!updated) {
      return err(new AppError("NOT_FOUND", `Job with ID ${id} not found`));
    }
    return ok(updated);
  } catch (error) {
    return err(
      new AppError("DB_ERROR", `Failed to update score breakdown for job ${id}`, error),
    );
  }
}

export async function updateJobTailoredResume(
  id: string,
  tailoredResumeText: string,
  tailoredResumeData?: TailoredResumeData | null,
): Promise<Result<JobSelect, AppError>> {
  try {
    const [updated] = await db
      .update(jobs)
      .set({
        tailoredResume: tailoredResumeText,
        tailoredResumeData: tailoredResumeData || null,
        status: "tailored",
      })
      .where(eq(jobs.id, id))
      .returning();

    if (!updated) {
      return err(new AppError("NOT_FOUND", `Job with ID ${id} not found`));
    }
    return ok(updated);
  } catch (error) {
    return err(
      new AppError("DB_ERROR", `Failed to update tailored resume for job ${id}`, error),
    );
  }
}

export async function updateJobCoverLetter(
  id: string,
  coverLetterText: string,
): Promise<Result<JobSelect, AppError>> {
  try {
    const [updated] = await db
      .update(jobs)
      .set({
        coverLetterDraft: coverLetterText,
      })
      .where(eq(jobs.id, id))
      .returning();

    if (!updated) {
      return err(new AppError("NOT_FOUND", `Job with ID ${id} not found`));
    }
    return ok(updated);
  } catch (error) {
    return err(
      new AppError("DB_ERROR", `Failed to update cover letter for job ${id}`, error),
    );
  }
}

export async function deleteJob(
  id: string,
): Promise<Result<boolean, AppError>> {
  try {
    const jobRes = await getJobById(id);
    if (!jobRes.ok) return err(jobRes.error);
    const job = jobRes.value;

    const { deletedJobs } = await import("@/services/db/schema");
    await db
      .insert(deletedJobs)
      .values({
        source: job.source,
        externalId: job.externalId,
      })
      .onConflictDoNothing();

    await db.delete(jobs).where(eq(jobs.id, id));
    return ok(true);
  } catch (error) {
    return err(new AppError("DB_ERROR", `Failed to delete job ${id}`, error));
  }
}

export async function isJobDeleted(
  source: string,
  externalId: string,
): Promise<boolean> {
  try {
    const { deletedJobs } = await import("@/services/db/schema");
    const { and } = await import("drizzle-orm");
    const [found] = await db
      .select()
      .from(deletedJobs)
      .where(
        and(
          eq(deletedJobs.source, source),
          eq(deletedJobs.externalId, externalId),
        ),
      );
    return !!found;
  } catch {
    return false;
  }
}

export async function restoreJob(
  data: JobInsert,
): Promise<Result<JobSelect, AppError>> {
  try {
    const { deletedJobs } = await import("@/services/db/schema");
    const { and } = await import("drizzle-orm");
    await db
      .delete(deletedJobs)
      .where(
        and(
          eq(deletedJobs.source, data.source),
          eq(deletedJobs.externalId, data.externalId),
        ),
      );
    return await upsertJob(data);
  } catch (E) {
    console.error(E);
    return err(new AppError("DB_ERROR", "Failed to restore job", E));
  }
}
