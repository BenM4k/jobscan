import "server-only";
import { JobStatus } from "@/services/db/schema";
import * as jobsDal from "@/dal/jobs.dal";

import * as profileDal from "@/dal/profile.dal";
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

      // Check if candidate previously deleted this job listing
      const deleted = await jobsDal.isJobDeleted(normalized.source, normalized.externalId, userId);
      if (deleted) {
        continue;
      }

      const res = await jobsDal.upsertJob({
        userId,
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
        status: "new",
      });

      if (res.ok) {
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

  const profileResult = await profileDal.getProfile(userId);
  if (!profileResult.ok) return profileResult;
  const userProfile = profileResult.value;

  if (!userProfile || !userProfile.resumeText || !userProfile.resumeText.trim()) {
    return err(
      new AppError(
        "NO_MASTER_RESUME",
        "User master resume is not configured. Please set up your master resume in Profile before scoring jobs."
      )
    );
  }

  const provider = getScoringProvider(preferredProvider || userProfile.aiProvider);
  const scoreResult = await provider.scoreJob(
    job.title,
    job.description || "",
    userProfile.resumeText,
    userProfile.skills || []
  );

  if (!scoreResult.ok) return scoreResult;

  return await jobsDal.updateJobScoreAndCoverLetter(
    job.id,
    scoreResult.value.fitScore,
    scoreResult.value.scoreReasoning,
    scoreResult.value.coverLetterDraft,
    scoreResult.value.tailoredResume
  );

}

export async function transitionJobStatus(
  jobId: string,
  targetStatus: JobStatus,
  userId?: string
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
