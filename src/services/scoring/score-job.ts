import "server-only";
import type { score } from "@/services/db/schema";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";
import { getCachedScore, setCachedScore } from "@/services/ai/score-cache";
import { checkRateLimit } from "@/services/ai/rate-limit";
import * as jobsDal from "@/dal/jobs.dal";
import * as resumeDal from "@/dal/resume.dal";
import * as skillsDal from "@/dal/skills.dal";
import { logAiCall } from "@/services/ai/with-cost-tracking";
import * as skillsService from "@/services/skills.service";
import { computeHybridScore } from "@/services/job.service";
import { isHybridScoringEnabled } from "@/services/flags";
import {
  getGlobalAiModel,
  getGlobalAiProvider,
} from "@/services/ai/provider-config";

/**
 * Versioned label stored across hybrid score records.
 */
export const MODEL_USED = "hybrid-v1";

export interface ScoreJobParams {
  job: {
    id: string;
    title: string;
    description?: string | null;
    language?: string;
  };
  resume: {
    id: string;
    version: number;
    content: string;
    language?: string;
  };
  pipelineEntryId: string;
  userId: string;
}

export interface CachedHybridScore {
  finalScore: number;
  cosineSimilarity: number | null;
  bm25Rank: number | null;
  matchedSkills: string[];
  missingSkills: string[];
  explanation: string;
  jobSkills?: string[];
  resumeSkills?: string[];
}

export type ScoreRecord = typeof score.$inferSelect;
export type ScoreResult = ScoreRecord;

export interface RateLimitedError {
  code: "rate_limited";
  retryAfterSeconds: number;
}

export type ScoreJobError = RateLimitedError | AppError;

/**
 * Step 15 & 16 Orchestrator: Unified job fit scoring for a candidate resume.
 *
 * Sequence:
 * 1. Rate-limit check (at VERY TOP before cache check: 1 token/10s, burst capacity 20)
 * 2. Cache check (Redis with LRU eviction)
 * 3. On cache HIT: Still persist a score row into the database (for history & audit continuity), log 0 tokens.
 * 4. On cache MISS:
 *    - Cosine similarity (pgvector dense search)
 *    - BM25 rank (PostgreSQL tsvector sparse full-text search)
 *    - Hybrid blend with language-aware weight redistribution
 *    - Skill-gap analysis + "Why this matched" explanation via combined LLM call
 *    - Relational persistence of extracted skills (job_skill & resume_skill)
 *    - Atomic insertion into score table
 *    - Write fresh result to Redis cache with 7-day TTL
 */
export async function scoreJobForResume(
  job: ScoreJobParams["job"],
  resume: ScoreJobParams["resume"],
  pipelineEntryId: string | null,
  userId: string,
  options?: { precomputedCosineSimilarity?: number }
): Promise<Result<ScoreResult, ScoreJobError>> {
  try {
    // 1. Rate-limit check at VERY TOP before cache check (Step 16 protection, fail-open if Redis unavailable)
    const rateLimit = await checkRateLimit(userId, "scoring");
    if (!rateLimit.allowed) {
      return err({
        code: "rate_limited",
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      });
    }

    const isHybridEnabled = await isHybridScoringEnabled(userId);
    const cacheModelKey = isHybridEnabled
      ? `${MODEL_USED}-hybrid`
      : `${MODEL_USED}-semantic`;

    // 2. Cache check
    const cached = await getCachedScore<CachedHybridScore>(
      job.id,
      resume.id,
      resume.version,
      cacheModelKey
    );

    if (cached) {
      // 3. Cache HIT: A score row is STILL inserted via DAL so history/analytics stay complete
      const insertRes = await jobsDal.insertHybridScoreRecord({
        pipelineEntryId,
        canonicalJobId: job.id,
        userId,
        resumeId: resume.id,
        resumeVersion: resume.version,
        modelUsed: MODEL_USED,
        finalScore: cached.finalScore,
        cosineSimilarity: cached.cosineSimilarity,
        bm25Rank: cached.bm25Rank,
        matchedSkills: cached.matchedSkills ?? [],
        missingSkills: cached.missingSkills ?? [],
        explanation: cached.explanation ?? null,
      });

      if (!insertRes.ok) {
        return err(insertRes.error);
      }

      await logAiCall({
        userId,
        feature: "scoring",
        provider: "cache",
        model: MODEL_USED,
        inputTokens: null,
        outputTokens: null,
        costEstimateUsd: "0.000000",
        cacheHit: true,
      });

      return ok(insertRes.value);
    }

    // 4. Cache MISS:
    const jobLanguage = (job.language as "en" | "fr") || "en";
    const resumeLanguage = (resume.language as "en" | "fr") || "en";
    const isLanguageMatch = jobLanguage === resumeLanguage;

    const skillsRes = await resumeDal.getResumeSkills(resume.id);
    const resumeSkills = skillsRes.ok ? skillsRes.value : [];
    const expectsKeywordScore = isHybridEnabled && isLanguageMatch;
    const canComputeBm25 =
      expectsKeywordScore && skillsRes.ok && resumeSkills.length > 0;
    const queryTerms = resumeSkills.slice(0, 20).join(" or ");

    const [cosineRes, bm25Res] = await Promise.all([
      options?.precomputedCosineSimilarity !== undefined
        ? Promise.resolve(ok(options.precomputedCosineSimilarity))
        : jobsDal.getJobResumeSimilarity(job.id, resume.id),
      canComputeBm25
        ? jobsDal.getJobResumeTsRank(job.id, queryTerms, jobLanguage)
        : Promise.resolve(ok(null)),
    ]);

    if (!cosineRes.ok) {
      return err(cosineRes.error);
    }

    const cosine = cosineRes.value;
    const bm25 = bm25Res.ok ? bm25Res.value : null;
    const hasExpectedKeywordScore =
      !expectsKeywordScore || (canComputeBm25 && bm25Res.ok && bm25 !== null);

    // B. Hybrid blend (undecayed)
    const finalScore = computeHybridScore(
      cosine,
      bm25,
      jobLanguage,
      resumeLanguage
    );

    // C. Skill-gap + "Why this matched" explanation call (Step 13 combined)
    const activeProvider = await getGlobalAiProvider();
    const activeModelId = await getGlobalAiModel(activeProvider);
    const matchRes = await skillsService.analyzeJobResumeMatch(
      job.description || "",
      resume.content,
      jobLanguage,
      userId,
      activeProvider,
      activeModelId
    );

    let existingJobSkills: string[] = [];
    if (!matchRes.ok) {
      const existingJobRes = await skillsDal.getJobSkills(job.id);
      if (existingJobRes.ok) {
        existingJobSkills = existingJobRes.value;
      }
    }

    const extractedJobSkills = matchRes.ok
      ? matchRes.value.jobSkills
      : existingJobSkills;
    const extractedResumeSkills = matchRes.ok
      ? matchRes.value.resumeSkills
      : resumeSkills;
    const explanation = matchRes.ok
      ? matchRes.value.explanation
      : !isLanguageMatch
        ? `Cross-lingual match: job (${jobLanguage.toUpperCase()}) and resume (${resumeLanguage.toUpperCase()}) differ. Semantic embedding score applied.`
        : `Hybrid match score (${finalScore}/100) calculated from dense vector similarity and sparse keyword match.`;

    const { matchedSkills, missingSkills } = skillsService.diffSkills(
      extractedJobSkills,
      extractedResumeSkills
    );

    // D. Persist extracted skills relationally
    await Promise.all([
      matchRes.ok
        ? skillsDal.syncJobSkills(job.id, extractedJobSkills)
        : Promise.resolve(ok(undefined)),
      resumeDal.syncResumeSkills(resume.id, extractedResumeSkills),
    ]);

    // E. Persist to score table via DAL (undecayed raw score)
    const insertRes = await jobsDal.insertHybridScoreRecord({
      pipelineEntryId,
      canonicalJobId: job.id,
      userId,
      resumeId: resume.id,
      resumeVersion: resume.version,
      modelUsed: MODEL_USED,
      finalScore,
      cosineSimilarity: cosine,
      bm25Rank: bm25,
      matchedSkills,
      missingSkills,
      explanation,
    });

    if (!insertRes.ok) {
      return err(insertRes.error);
    }

    // F. Cache write only when skill/explanation analysis succeeded and expected keyword inputs were measured
    if (matchRes.ok && hasExpectedKeywordScore) {
      const cachePayload: CachedHybridScore = {
        finalScore,
        cosineSimilarity: cosine,
        bm25Rank: bm25,
        matchedSkills,
        missingSkills,
        explanation,
        jobSkills: extractedJobSkills,
        resumeSkills: extractedResumeSkills,
      };

      await setCachedScore(
        job.id,
        resume.id,
        resume.version,
        cacheModelKey,
        cachePayload
      );
    }

    return ok(insertRes.value);
  } catch (error) {
    return err(
      new AppError(
        "AI_EXECUTION_ERROR",
        `Failed to score job ${job.id} for resume ${resume.id}`,
        error
      )
    );
  }
}
