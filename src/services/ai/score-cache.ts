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
 * Key format: score:${jobId}:${resumeVersion}:${modelVersion}
 * resumeVersion on masterResume automatically invalidates stale scores on resume updates.
 */
export function getScoreCacheKey(
  jobId: string,
  resumeVersion: number | string,
  modelVersion: string
): string {
  return `score:${jobId}:${resumeVersion}:${modelVersion}`;
}

/**
 * Retrieves a previously cached AI match score if available.
 */
export async function getCachedScore(
  jobId: string,
  resumeVersion: number | string,
  modelVersion: string
): Promise<ScoreResult | null> {
  const key = getScoreCacheKey(jobId, resumeVersion, modelVersion);
  return await cacheGet<ScoreResult>(key);
}

/**
 * Persists an AI match score to Redis with TTL.
 */
export async function setCachedScore(
  jobId: string,
  resumeVersion: number | string,
  modelVersion: string,
  score: ScoreResult,
  ttlSeconds = DEFAULT_SCORE_CACHE_TTL_SECONDS
): Promise<void> {
  const key = getScoreCacheKey(jobId, resumeVersion, modelVersion);
  await cacheSet(key, score, ttlSeconds);
}

/**
 * Explicitly evicts a cached score key.
 */
export async function invalidateCachedScore(
  jobId: string,
  resumeVersion: number | string,
  modelVersion: string
): Promise<number> {
  const key = getScoreCacheKey(jobId, resumeVersion, modelVersion);
  return await cacheDel(key);
}
