import "server-only";
import { db } from "@/services/db";
import { score, pipelineEntry } from "@/services/db/schema";
import { eq } from "drizzle-orm";
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
import { isFeatureEnabled } from "@/services/flags";

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
  pipelineEntryId: string,
  userId: string
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

    // 2. Cache check
    const cached = await getCachedScore<CachedHybridScore>(
      job.id,
      resume.version,
      MODEL_USED
    );

    if (cached) {
      // 3. Cache HIT: A score row is STILL inserted so history/analytics stay complete
      const [insertedScore] = await db
        .insert(score)
        .values({
          pipelineEntryId,
          resumeVersion: resume.version,
          modelUsed: MODEL_USED,
          finalScore: cached.finalScore.toString(),
          cosineSimilarity:
            cached.cosineSimilarity != null
              ? cached.cosineSimilarity.toString()
              : null,
          bm25Rank:
            cached.bm25Rank != null ? cached.bm25Rank.toString() : null,
          matchedSkills: cached.matchedSkills ?? [],
          missingSkills: cached.missingSkills ?? [],
          explanation: cached.explanation ?? null,
        })
        .returning();

      await db
        .update(pipelineEntry)
        .set({ updatedAt: new Date(), resumeIdUsed: resume.id })
        .where(eq(pipelineEntry.id, pipelineEntryId));

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

      return ok(insertedScore);
    }

    // 4. Cache MISS:
    const jobLanguage = (job.language as "en" | "fr") || "en";
    const resumeLanguage = (resume.language as "en" | "fr") || "en";
    const isLanguageMatch = jobLanguage === resumeLanguage;

    // A. Cosine distance + BM25 lookup (gated by "hybrid-scoring-v1" feature flag)
    const isHybridEnabled = await isFeatureEnabled(userId, "hybrid-scoring-v1");
    const canComputeBm25 = isLanguageMatch && isHybridEnabled;

    const skillsRes = await resumeDal.getResumeSkills(resume.id);
    const resumeSkills = skillsRes.ok ? skillsRes.value : [];
    const queryTerms =
      resumeSkills.length > 0
        ? resumeSkills.slice(0, 20).join(" or ")
        : jobLanguage === "fr"
          ? "développeur"
          : "developer";

    const [cosineRes, bm25Res] = await Promise.all([
      jobsDal.getJobResumeSimilarity(job.id, resume.id),
      canComputeBm25
        ? jobsDal.getJobResumeTsRank(job.id, queryTerms, jobLanguage)
        : Promise.resolve(ok(null)),
    ]);

    const cosine = cosineRes.ok ? cosineRes.value : null;
    const bm25 = bm25Res.ok ? bm25Res.value : null;

    // B. Hybrid blend (undecayed)
    const finalScore = computeHybridScore(
      cosine,
      bm25,
      jobLanguage,
      resumeLanguage
    );

    // C. Skill-gap + "Why this matched" explanation call (Step 13 combined)
    const matchRes = await skillsService.analyzeJobResumeMatch(
      job.description || "",
      resume.content,
      jobLanguage,
      userId
    );

    const extractedJobSkills = matchRes.ok ? matchRes.value.jobSkills : [];
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
      skillsDal.syncJobSkills(job.id, extractedJobSkills),
      resumeDal.syncResumeSkills(resume.id, extractedResumeSkills),
    ]);

    // E. Persist to score table (undecayed raw score)
    const [insertedScore] = await db
      .insert(score)
      .values({
        pipelineEntryId,
        resumeVersion: resume.version,
        modelUsed: MODEL_USED,
        finalScore: finalScore.toString(),
        cosineSimilarity: cosine != null ? cosine.toString() : null,
        bm25Rank: bm25 != null ? bm25.toString() : null,
        matchedSkills,
        missingSkills,
        explanation,
      })
      .returning();

    await db
      .update(pipelineEntry)
      .set({ updatedAt: new Date(), resumeIdUsed: resume.id })
      .where(eq(pipelineEntry.id, pipelineEntryId));

    // F. Cache write with 7-day TTL
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

    await setCachedScore(job.id, resume.version, MODEL_USED, cachePayload);

    return ok(insertedScore);
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
