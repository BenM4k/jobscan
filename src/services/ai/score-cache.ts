import "server-only";
import { cacheGet, cacheSet, cacheDel } from "@/services/cache/redis-client";
import type { ScoreResult } from "@/services/scoring/types";

/**
 * Default TTL for cached job match scores: 7 days in seconds.
 * In a system with maxmemory-policy allkeys-lru, Redis will evict older keys under pressure.
 */
export const DEFAULT_SCORE_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // 604,800s

/**
 * Generates the cache key for an AI job score.
 * Key format: score:${jobId}:${resumeId}:${resumeVersion}:${modelVersion}
 * resumeId isolates scores between different resumes/personas.
 * resumeVersion on masterResume automatically invalidates stale scores on resume updates.
 */
export function getScoreCacheKey(
  jobId: string,
  resumeId: string,
  resumeVersion: number | string,
  modelVersion: string
): string {
  return `score:${jobId}:${resumeId}:${resumeVersion}:${modelVersion}`;
}

/**
 * Retrieves a previously cached match score if available.
 * Gracefully treats any Redis error as a cache miss (returns null).
 */
export async function getCachedScore<T = ScoreResult>(
  jobId: string,
  resumeId: string,
  resumeVersion: number | string,
  modelVersion: string
): Promise<T | null> {
  try {
    const key = getScoreCacheKey(jobId, resumeId, resumeVersion, modelVersion);
    return await cacheGet<T>(key);
  } catch (err) {
    console.warn(
      `[ScoreCache] Error getting score cache for job ${jobId}, treating as miss:`,
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

/**
 * Persists an AI match score to Redis with TTL.
 * Silently catches write failures to ensure Redis errors never block the request.
 */
export async function setCachedScore<T = ScoreResult>(
  jobId: string,
  resumeId: string,
  resumeVersion: number | string,
  modelVersion: string,
  score: T,
  ttlSeconds = DEFAULT_SCORE_CACHE_TTL_SECONDS
): Promise<void> {
  try {
    const key = getScoreCacheKey(jobId, resumeId, resumeVersion, modelVersion);
    await cacheSet(key, score, ttlSeconds);
  } catch (err) {
    console.warn(
      `[ScoreCache] Error writing score cache for job ${jobId}:`,
      err instanceof Error ? err.message : err
    );
  }
}

/**
 * Explicitly evicts a cached score key.
 */
export async function invalidateCachedScore(
  jobId: string,
  resumeId: string,
  resumeVersion: number | string,
  modelVersion: string
): Promise<number> {
  try {
    const key = getScoreCacheKey(jobId, resumeId, resumeVersion, modelVersion);
    return await cacheDel(key);
  } catch (err) {
    console.warn(
      `[ScoreCache] Error invalidating score cache for job ${jobId}:`,
      err instanceof Error ? err.message : err
    );
    return 0;
  }
}
