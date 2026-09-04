import "server-only";
import { JobStatus } from "@/services/db/schema";
import * as jobsDal from "@/dal/jobs.dal";
import * as resumeDal from "@/dal/resume.dal";
import * as opsDal from "@/dal/ops.dal";

import { getJobSourceAdapter } from "./adapters/factory";
import { getScoringProvider } from "./scoring/factory";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";

const VALID_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  new: ["saved", "scored", "tailored", "applied", "rejected"],
  saved: ["scored", "tailored", "applied", "rejected"],
  scored: ["tailored", "applied", "interviewing", "rejected"],
  tailored: ["applied", "interviewing", "rejected"],
  applied: ["interviewing", "rejected", "offer"],
  interviewing: ["offer", "rejected"],
  rejected: ["saved", "new", "applied"],
  offer: [],
  withdrawn: ["saved"],
};

import { isOlderThanOneMonth } from "@/lib/date-utils";

export async function fetchAndUpsertJobs(
  sourceId: "greenhouse" | "remoteok" | "lever" | "ashby",
  target?: string,
  userId?: string
): Promise<Result<{ fetched: number; upserted: number }, AppError>> {
  try {
    const adapter = getJobSourceAdapter(sourceId);
    const rawItems = await adapter.fetchRaw(target);


    let upsertedCount = 0;
    for (const raw of rawItems) {
      const normalized = adapter.normalize(raw);

      // Skip jobs posted longer than a month ago
      if (normalized.postedAt && isOlderThanOneMonth(normalized.postedAt)) {
        continue;
      }

      // Check if candidate previously deleted this job listing.
      if (userId) {
        const deleted = await jobsDal.isJobDeleted(normalized.source, normalized.externalId, userId);
        if (deleted) {
          continue;
        }
      }

      // 1. Ingest raw payload
      await jobsDal.insertRawJobPayload(
        normalized.source as jobsDal.JobSource,
        normalized.externalId,
        raw as Record<string, unknown>
      );

      // 2. Upsert canonical job
      const res = await jobsDal.upsertJob({
        userId: userId || undefined,
        source: normalized.source,
        externalId: normalized.externalId,
        title: normalized.title,
        company: normalized.company,
        url: normalized.url,
        description: normalized.description,
        postedAt: normalized.postedAt,
        country: normalized.country,
        countryCode: normalized.countryCode,
        city: normalized.city,
        workplaceType: normalized.workplaceType,
        remoteRegions: normalized.remoteRegions,
        status: "active",
      });

      if (res.ok) {
        await jobsDal.linkJobSourceRef(
          res.value.id,
          normalized.source as jobsDal.JobSource,
          normalized.externalId,
          normalized.url
        );
        upsertedCount++;
      }
    }

    return ok({ fetched: rawItems.length, upserted: upsertedCount });
  } catch (error) {
    return err(
      new AppError(
        "EXTERNAL_API_ERROR",
        `Failed to fetch jobs from source ${sourceId}`,
        error
      )
    );
  }
}

export async function scoreJobWithAI(
  jobId: string,
  userId: string,
  preferredProvider?: string
): Promise<Result<jobsDal.JobSelect, AppError>> {
  const jobResult = await jobsDal.getJobById(jobId, userId);
  if (!jobResult.ok) return jobResult;
  const job = jobResult.value;

  // Gate on master_resume — AI scoring requires an active resume (per AGENTS.md §5)
  const resumeRes = await resumeDal.getActiveMasterResume(userId);
  if (!resumeRes.ok) return err(resumeRes.error);
  const activeResume = resumeRes.value;
  const resumeText = activeResume?.content || "";
  let resumeSkills: string[] = [];

  if (activeResume) {
    const skillsRes = await resumeDal.getResumeSkills(activeResume.id);
    if (skillsRes.ok) resumeSkills = skillsRes.value;
  }

  if (!resumeText || !resumeText.trim()) {
    return err(
      new AppError(
        "NO_MASTER_RESUME",
        "User master resume is not configured. Please set up your master resume in Profile before scoring jobs."
      )
    );
  }

  const provider = getScoringProvider(preferredProvider);
  const scoreResult = await provider.scoreJob(
    job.title,
    job.description || "",
    resumeText,
    resumeSkills
  );

  if (!scoreResult.ok) return scoreResult;

  const { _usage, ...score } = scoreResult.value;

  // Log AI ops metrics with real token counts from the provider
  await opsDal.logAiCall({
    userId,
    feature: "scoring",
    provider: provider.name,
    model: _usage.modelId,
    inputTokens: _usage.inputTokens,
    outputTokens: _usage.outputTokens,
  });

  return await jobsDal.updateJobScoreAndCoverLetter(
    job.id,
    score.fitScore,
    score.scoreReasoning,
    score.coverLetterDraft,
    score.tailoredResume,
    score.matchedSkills,
    score.missingSkills,
    undefined,
    _usage.modelId,
    activeResume?.version
  );
}

export async function transitionJobStatus(
  jobId: string,
  targetStatus: JobStatus,
  userId: string,
): Promise<Result<jobsDal.JobSelect, AppError>> {
  const currentResult = await jobsDal.getJobById(jobId, userId);
  if (!currentResult.ok) return currentResult;
  const currentJob = currentResult.value;

  const allowed = VALID_TRANSITIONS[currentJob.status as JobStatus] || [];
  if (!allowed.includes(targetStatus)) {
    return err(
      new AppError(
        "VALIDATION_ERROR",
        `Invalid status transition from '${currentJob.status}' to '${targetStatus}'. Allowed target statuses: [${allowed.join(
          ", "
        )}]`
      )
    );
  }

  return await jobsDal.updateJobStatus(jobId, targetStatus);
}
