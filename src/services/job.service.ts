import "server-only";
import { JobStatus } from "@/services/db/schema";
import * as jobsDal from "@/dal/jobs.dal";
import * as pipelineDal from "@/dal/pipeline.dal";
import * as resumeDal from "@/dal/resume.dal";
import * as opsDal from "@/dal/ops.dal";
import * as skillsDal from "@/dal/skills.dal";
import * as skillsService from "./skills.service";
import { diffSkills } from "./skills.service";

import { ingestFromSource } from "./adapters";
import type { IngestResult, IngestionAggregatedResult } from "./adapters/types";
import { getScoringProvider } from "./scoring/factory";
import { getCachedScore, setCachedScore } from "./ai/score-cache";
import { withAiTracking } from "./ai/tracker";
import type { ScoreResult } from "./scoring/types";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";

const VALID_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  new: ["saved", "scored", "tailored", "applied", "rejected"],
  saved: ["scored", "tailored", "applied", "rejected"],
  scored: ["tailored", "applied", "rejected"],
  tailored: ["applied", "rejected"],
  applied: ["interviewing", "rejected"],
  interviewing: ["offer", "rejected"],
  rejected: ["saved"],
  offer: [],
  withdrawn: ["saved"],
};

export { ingestFromSource };

export async function fetchAndUpsertJobs(
  sourceId: string,
  target?: string,
  userId?: string,
): Promise<Result<IngestResult, AppError>> {
  return await ingestFromSource(sourceId, { target, userId });
}

export async function fetchAndUpsertJobsAcrossSources(
  sourceIds: string[],
  target?: string,
  userId?: string,
): Promise<Result<IngestionAggregatedResult, AppError>> {
  let totalFetched = 0;
  let totalUpserted = 0;
  let totalFailed = 0;
  const sources: IngestResult[] = [];

  const results = await Promise.all(
    sourceIds.map((sourceId) => ingestFromSource(sourceId, { target, userId }))
  );

  for (let i = 0; i < sourceIds.length; i++) {
    const sourceId = sourceIds[i];
    const res = results[i];
    if (res.ok) {
      sources.push(res.value);
      totalFetched += res.value.fetched;
      totalUpserted += res.value.upserted;
      totalFailed += res.value.failed;
    } else {
      sources.push({
        source: sourceId,
        fetched: 0,
        upserted: 0,
        failed: 0,
        skipped: true,
        reason: "fetch_failed",
        message: res.error.message,
      });
    }
  }

  return ok({
    totalFetched,
    totalUpserted,
    totalFailed,
    sources,
    fetched: totalFetched,
    upserted: totalUpserted,
    failed: totalFailed,
  });
}

export async function scoreJobWithAI(
  jobId: string,
  userId: string,
  preferredProvider?: "claude" | "gemini" | "openai" | "gateway",
  resumeId?: string,
): Promise<Result<jobsDal.JobSelect, AppError>> {
  const jobResult = await jobsDal.getJobById(jobId, userId);
  if (!jobResult.ok) return jobResult;
  const job = jobResult.value;

  // Gate on master_resume — resolve specific persona or active resume (per AGENTS.md §5)
  let activeResume: resumeDal.MasterResumeSelect | null = null;
  if (resumeId) {
    const resumeRes = await resumeDal.getMasterResumeById(resumeId, userId);
    if (!resumeRes.ok) return err(resumeRes.error);
    if (!resumeRes.value) {
      return err(new AppError("NOT_FOUND", `Requested resume persona ${resumeId} not found`));
    }
    activeResume = resumeRes.value;
  } else {
    const resumeRes = await resumeDal.getActiveMasterResume(userId);
    if (!resumeRes.ok) return err(resumeRes.error);
    activeResume = resumeRes.value;
  }

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
        "User master resume is not configured. Please set up your master resume in Profile before scoring jobs.",
      ),
    );
  }

  const provider = getScoringProvider(preferredProvider);
  const resumeVersion = activeResume.version;
  const modelVersion = provider.modelId;

  // 1. Check LRU/LFU score cache before calling provider (per AGENTS.md)
  const cachedScore = await getCachedScore(
    job.id,
    activeResume.id,
    resumeVersion,
    modelVersion
  );
  let score: ScoreResult;

  if (cachedScore) {
    score = cachedScore;
    await opsDal.logAiCall({
      userId,
      feature: "scoring",
      provider: provider.name,
      model: modelVersion,
      inputTokens: 0,
      outputTokens: 0,
      costEstimateUsd: "0.000000",
      cacheHit: true,
    });
  } else {
    // 2. Wrap AI call with cost/token tracking decorator
    const scoreResult = await withAiTracking(
      {
        userId,
        feature: "scoring",
        provider: provider.name,
        model: modelVersion,
      },
      () =>
        provider.scoreJob(
          job.title,
          job.description || "",
          resumeText,
          resumeSkills,
        ),
    );

    if (!scoreResult.ok) return scoreResult;

    score = scoreResult.value;

    // Cache the fresh score in Redis with TTL
    await setCachedScore(
      job.id,
      activeResume.id,
      resumeVersion,
      modelVersion,
      score
    );
  }

  // Extract skills: use the structured JSON output from the scoring LLM call (or fallback to combined extraction)
  let extractedJobSkills =
    score.jobSkills && score.jobSkills.length > 0 ? score.jobSkills : [];
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
      preferredProvider,
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
    extractedResumeSkills,
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
    modelVersion,
    activeResume?.version,
    userId,
    undefined,
    undefined,
    activeResume.id
  );
}

export const DEFAULT_HYBRID_WEIGHTS = {
  wSemantic: 0.6,
  wKeyword: 0.4,
} as const;

/**
 * Computes hybrid fit score with dual-language awareness:
 * - If jobLanguage !== resumeLanguage: cross-lingual keyword matching is skipped.
 *   Full weight is redistributed to the semantic embedding score (returns semantic alone,
 *   avoiding penalizing the candidate with a 0 keyword score).
 * - If jobLanguage === resumeLanguage: blends dense cosine similarity and sparse keyword rank
 *   using starting weights W_SEMANTIC = 0.6, W_KEYWORD = 0.4 (normalized and clamped to 0-100).
 */
export function computeHybridScore(
  semanticScore: number | null,
  keywordScore: number | null,
  jobLanguage: "en" | "fr" = "en",
  resumeLanguage: "en" | "fr" = "en",
  weights: { wSemantic?: number; wKeyword?: number } = DEFAULT_HYBRID_WEIGHTS,
): number {
  // If languages mismatch, redistribute 100% weight to semantic score (no zero-keyword penalty)
  if (jobLanguage !== resumeLanguage) {
    if (semanticScore === null || semanticScore === undefined) return 0;
    return Math.min(100, Math.max(0, Math.round(semanticScore * 100)));
  }

  const wSemantic = weights.wSemantic ?? DEFAULT_HYBRID_WEIGHTS.wSemantic;
  const wKeyword = weights.wKeyword ?? DEFAULT_HYBRID_WEIGHTS.wKeyword;
  const totalWeight = (wSemantic || 0) + (wKeyword || 0);

  if (semanticScore !== null && keywordScore !== null) {
    const blended =
      totalWeight > 0
        ? (wSemantic * semanticScore + wKeyword * keywordScore) / totalWeight
        : semanticScore;
    return Math.min(100, Math.max(0, Math.round(blended * 100)));
  }

  if (semanticScore !== null) {
    return Math.min(100, Math.max(0, Math.round(semanticScore * 100)));
  }

  if (keywordScore !== null) {
    return Math.min(100, Math.max(0, Math.round(keywordScore * 100)));
  }

  return 0;
}

/**
 * Backward-compatible alias for computeHybridScore with matching languages.
 */
export function blendHybridScores(
  cosine: number | null,
  bm25: number | null,
  w1: number = 0.6,
  w2: number = 0.4,
): number {
  return computeHybridScore(cosine, bm25, "en", "en", {
    wSemantic: w1,
    wKeyword: w2,
  });
}

/**
 * Score a job using pure hybrid scoring (dense cosine similarity + sparse full-text ts_rank)
 * with dual-language awareness without invoking external AI providers.
 */
export async function scoreJobHybrid(
  jobId: string,
  userId: string,
  weights: { w1?: number; w2?: number } = { w1: 0.6, w2: 0.4 },
): Promise<Result<jobsDal.JobSelect, AppError>> {
  const w1 = weights.w1 ?? 0.6;
  const w2 = weights.w2 ?? 0.4;

  const jobResult = await jobsDal.getJobById(jobId, userId);
  if (!jobResult.ok) return jobResult;
  const job = jobResult.value;

  // Resolve canonical job ID: if jobId was a pipeline entry, resolve entry.jobId
  let canonicalJobId = job.id;
  const entryRes = await pipelineDal.getPipelineEntryById(jobId, userId);
  if (entryRes.ok) {
    canonicalJobId = entryRes.value.jobId;
  } else if (entryRes.error.code === "NOT_FOUND") {
    const entryByJob = await pipelineDal.getPipelineEntryByUserAndJob(userId, jobId);
    if (!entryByJob.ok) {
      return err(entryByJob.error);
    }
    if (entryByJob.value) {
      canonicalJobId = entryByJob.value.jobId;
    }
  } else {
    return err(entryRes.error);
  }

  const resumeRes = await resumeDal.getActiveMasterResume(userId);
  if (!resumeRes.ok) return err(resumeRes.error);
  const activeResume = resumeRes.value;

  if (!activeResume || !activeResume.content?.trim()) {
    return err(
      new AppError(
        "NO_MASTER_RESUME",
        "User master resume is not configured. Please set up your master resume in Profile before scoring jobs.",
      ),
    );
  }

  const jobLanguage = ((job as { language?: string }).language as "en" | "fr") || "en";
  const resumeLanguage =
    ((activeResume as { language?: string }).language as "en" | "fr") || "en";
  const isLanguageMatch = jobLanguage === resumeLanguage;

  let resumeSkills: string[] = [];
  const skillsRes = await resumeDal.getResumeSkills(activeResume.id);
  if (skillsRes.ok) resumeSkills = skillsRes.value;

  const queryTerms =
    resumeSkills.length > 0
      ? resumeSkills.slice(0, 20).join(" or ")
      : jobLanguage === "fr"
        ? "développeur"
        : "developer";

  const [cosineRes, bm25Res] = await Promise.all([
    jobsDal.getJobResumeSimilarity(canonicalJobId, activeResume.id),
    isLanguageMatch
      ? jobsDal.getJobResumeTsRank(canonicalJobId, queryTerms, jobLanguage)
      : Promise.resolve(ok(null)),
  ]);

  const cosine = cosineRes.ok ? cosineRes.value : null;
  const bm25 = bm25Res.ok ? bm25Res.value : null;

  const rawFinalScore = computeHybridScore(
    cosine,
    bm25,
    jobLanguage,
    resumeLanguage,
    { wSemantic: w1, wKeyword: w2 },
  );

  const explanation = !isLanguageMatch
    ? `Cross-lingual match: job (${jobLanguage.toUpperCase()}) and resume (${resumeLanguage.toUpperCase()}) differ. 100% semantic embedding score applied (${
        cosine != null ? (cosine * 100).toFixed(1) : "N/A"
      }%) without keyword penalty.`
    : `Hybrid fit score (${rawFinalScore}/100) calculated from dense vector similarity (${
        cosine != null ? (cosine * 100).toFixed(1) : "N/A"
      }%) and sparse ${jobLanguage.toUpperCase()} keyword match (${
        bm25 != null ? (bm25 * 100).toFixed(1) : "N/A"
      }%) with weights [wSemantic=${w1}, wKeyword=${w2}].`;

  return await jobsDal.saveHybridScore(
    job.id,
    {
      finalScore: rawFinalScore,
      cosineSimilarity: cosine,
      bm25Rank: bm25,
      resumeVersion: activeResume.version,
      explanation,
    },
    userId,
  );
}

/**
 * Re-tunes weights for an already scored job entry without re-running AI calls.
 */
export async function tuneScoreWeights(
  pipelineEntryOrJobId: string,
  userId: string,
  w1: number,
  w2: number,
): Promise<
  Result<
    {
      finalScore: number;
      cosineSimilarity: number | null;
      bm25Rank: number | null;
    },
    AppError
  >
> {
  return await jobsDal.recalculateScoreWithWeights(
    pipelineEntryOrJobId,
    w1,
    w2,
    userId,
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
          ", ",
        )}]`,
      ),
    );
  }

  return await jobsDal.updateJobStatus(jobId, targetStatus);
}

export async function updateTailoredResume(
  jobId: string,
  tailoredResume: string,
  userId: string,
  structured?: jobsDal.TailoredResumeData | null,
): Promise<Result<jobsDal.JobSelect, AppError>> {
  return await jobsDal.updateJobTailoredResume(
    jobId,
    tailoredResume,
    structured ?? null,
    userId,
  );
}
