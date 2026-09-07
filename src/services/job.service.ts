import "server-only";
import { JobStatus } from "@/services/db/schema";
import * as jobsDal from "@/dal/jobs.dal";
import * as resumeDal from "@/dal/resume.dal";
import * as opsDal from "@/dal/ops.dal";
import * as skillsDal from "@/dal/skills.dal";
import * as skillsService from "./skills.service";
import { diffSkills } from "./skills.service";

import { getJobSourceAdapter } from "./job-sources";
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
      // DB Call 1: Write untouched external response into raw_job_payload first
      const rawRes = await adapter.saveRaw(raw);
      if (!rawRes.ok) {
        continue;
      }

      // DB Call 2: Read stored payload from raw_job_payload, normalize, and upsert canonical job
      const normRes = await adapter.normalizeFromStored(rawRes.value, userId);
      if (normRes.ok) {
        upsertedCount++;
      }
    }

    return ok({ fetched: rawItems.length, upserted: upsertedCount });
  } catch (error) {
    if (error instanceof AppError) {
      return err(error);
    }
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

  if (!activeResume || !resumeText || !resumeText.trim()) {
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

  // Extract skills: use the structured JSON output from the scoring LLM call (or fallback to combined extraction)
  let extractedJobSkills = score.jobSkills && score.jobSkills.length > 0 ? score.jobSkills : [];
  let extractedResumeSkills =
    score.resumeSkills && score.resumeSkills.length > 0
      ? score.resumeSkills
      : resumeSkills.length > 0
        ? resumeSkills
        : [];

  if (extractedJobSkills.length === 0 || extractedResumeSkills.length === 0) {
    const extRes = await skillsService.extractSkillsCombined(
      job.title,
      job.description || "",
      resumeText,
      preferredProvider
    );
    if (extRes.ok) {
      if (extractedJobSkills.length === 0) {
        extractedJobSkills = extRes.value.jobSkills;
      }
      if (extractedResumeSkills.length === 0) {
        extractedResumeSkills = extRes.value.resumeSkills;
      }
    }
  }

  // Naive skill-gap diffing
  const { matchedSkills, missingSkills } = diffSkills(
    extractedJobSkills,
    extractedResumeSkills
  );

  // Persist extracted skills to relational tables: job_skill and resume_skill
  await Promise.all([
    skillsDal.syncJobSkills(job.id, extractedJobSkills),
    resumeDal.syncResumeSkills(activeResume.id, extractedResumeSkills),
  ]);

  // Use "Why this matched" explanation string alongside score
  const matchExplanation = score.explanation || score.scoreReasoning || "";

  return await jobsDal.updateJobScoreAndCoverLetter(
    job.id,
    score.fitScore,
    matchExplanation,
    score.coverLetterDraft,
    score.tailoredResume,
    matchedSkills,
    missingSkills,
    undefined,
    _usage.modelId,
    activeResume?.version,
    userId
  );
}

/**
 * Blends dense cosine similarity and sparse BM25/ts_rank into a normalized 0-100 score.
 * Formula: finalScore = w1 * cosine + w2 * ts_rank (normalized by w1 + w2 and mapped to 0-100).
 */
export function blendHybridScores(
  cosine: number | null,
  bm25: number | null,
  w1: number = 0.7,
  w2: number = 0.3
): number {
  const totalWeight = (w1 || 0) + (w2 || 0);

  if (cosine !== null && bm25 !== null) {
    const blended = totalWeight > 0 ? (w1 * cosine + w2 * bm25) / totalWeight : cosine;
    return Math.min(100, Math.max(0, Math.round(blended * 100)));
  }

  if (cosine !== null) {
    return Math.min(100, Math.max(0, Math.round(cosine * 100)));
  }

  if (bm25 !== null) {
    return Math.min(100, Math.max(0, Math.round(bm25 * 100)));
  }

  return 0;
}

/**
 * Score a job using pure hybrid scoring (dense cosine similarity + sparse full-text ts_rank)
 * without invoking external AI providers.
 */
export async function scoreJobHybrid(
  jobId: string,
  userId: string,
  weights: { w1?: number; w2?: number } = { w1: 0.7, w2: 0.3 }
): Promise<Result<jobsDal.JobSelect, AppError>> {
  const w1 = weights.w1 ?? 0.7;
  const w2 = weights.w2 ?? 0.3;

  const jobResult = await jobsDal.getJobById(jobId, userId);
  if (!jobResult.ok) return jobResult;
  const job = jobResult.value;

  const resumeRes = await resumeDal.getActiveMasterResume(userId);
  if (!resumeRes.ok) return err(resumeRes.error);
  const activeResume = resumeRes.value;

  if (!activeResume || !activeResume.content?.trim()) {
    return err(
      new AppError(
        "NO_MASTER_RESUME",
        "User master resume is not configured. Please set up your master resume in Profile before scoring jobs."
      )
    );
  }

  let resumeSkills: string[] = [];
  const skillsRes = await resumeDal.getResumeSkills(activeResume.id);
  if (skillsRes.ok) resumeSkills = skillsRes.value;

  const queryTerms =
    resumeSkills.length > 0 ? resumeSkills.slice(0, 20).join(" or ") : "developer";

  const [cosineRes, bm25Res] = await Promise.all([
    jobsDal.getJobResumeSimilarity(job.id, activeResume.id),
    jobsDal.getJobResumeTsRank(job.id, queryTerms),
  ]);

  const cosine = cosineRes.ok ? cosineRes.value : null;
  const bm25 = bm25Res.ok ? bm25Res.value : null;

  const rawFinalScore = blendHybridScores(cosine, bm25, w1, w2);

  return await jobsDal.saveHybridScore(
    job.id,
    {
      finalScore: rawFinalScore,
      cosineSimilarity: cosine,
      bm25Rank: bm25,
      resumeVersion: activeResume.version,
      explanation: `Hybrid fit score (${rawFinalScore}/100) calculated from dense vector similarity (${
        cosine != null ? (cosine * 100).toFixed(1) : "N/A"
      }%) and sparse keyword match (${
        bm25 != null ? (bm25 * 100).toFixed(1) : "N/A"
      }%) with weights [w1=${w1}, w2=${w2}].`,
    },
    userId
  );
}

/**
 * Re-tunes weights for an already scored job entry without re-running AI calls.
 */
export async function tuneScoreWeights(
  pipelineEntryOrJobId: string,
  userId: string,
  w1: number,
  w2: number
): Promise<Result<{ finalScore: number; cosineSimilarity: number | null; bm25Rank: number | null }, AppError>> {
  return await jobsDal.recalculateScoreWithWeights(pipelineEntryOrJobId, w1, w2, userId);
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
