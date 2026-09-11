import "server-only";
import * as flagsDal from "@/dal/flags.dal";
import { cacheGet, cacheSet, cacheDel } from "@/services/cache/redis-client";

export const FEATURE_FLAG_CACHE_TTL_SECONDS = 60;

/**
 * Generates the cache key for a feature flag and user.
 * Format: flag:${flagKey}:${userId}
 */
export function getFeatureFlagCacheKey(
  flagKey: string,
  userId?: string | null
): string {
  return `flag:${flagKey}:${userId || "anon"}`;
}

/**
 * Step 18: Checks whether a feature flag is enabled for a given user.
 *
 * Sequence:
 * 1. Checks 60-second Redis cache (key: `flag:${flagKey}:${userId}`)
 * 2. On cache miss: queries DB (per-user override in featureFlagAssignment, else featureFlag.enabledGlobally)
 * 3. Fails CLOSED (returns false) on unknown flag key or database error
 * 4. Writes result to Redis with 60s TTL
 * 5. Degrades gracefully if Redis is unconfigured or offline (never throws)
 */
export async function isFeatureEnabled(
  userId: string | undefined | null,
  flagKey: string
): Promise<boolean> {
  const cacheKey = getFeatureFlagCacheKey(flagKey, userId);

  // 1. Try reading from Redis cache (60s TTL)
  try {
    const cached = await cacheGet<boolean>(cacheKey);
    if (typeof cached === "boolean") {
      return cached;
    }
  } catch (err) {
    // Redis error degrades gracefully; fall back to DB
    console.warn(`[Flags] Redis cache read failed for "${cacheKey}":`, err);
  }

  // 2. Query DB
  let enabled = false;
  try {
    const flag = await flagsDal.getFeatureFlagByKey(flagKey);
    if (!flag) {
      // Unknown flag fails CLOSED (returns false)
      return false;
    }

    if (userId) {
      const assignment = await flagsDal.getFeatureFlagAssignment(flag.id, userId);
      if (assignment) {
        enabled = assignment.enabled;
      } else {
        enabled = flag.enabledGlobally;
      }
    } else {
      enabled = flag.enabledGlobally;
    }
  } catch (err) {
    console.error(`[Flags] Error querying flag "${flagKey}" from DB:`, err);
    // Fail CLOSED
    return false;
  }

  // 3. Write to Redis cache with 60s TTL
  try {
    await cacheSet(cacheKey, enabled, FEATURE_FLAG_CACHE_TTL_SECONDS);
  } catch (err) {
    console.warn(`[Flags] Redis cache write failed for "${cacheKey}":`, err);
  }

  return enabled;
}

/**
 * Invalidate the Redis cache for a user's feature flag evaluation.
 */
export async function invalidateFeatureFlagCache(
  flagKey: string,
  userId?: string | null
): Promise<void> {
  try {
    const key = getFeatureFlagCacheKey(flagKey, userId);
    await cacheDel(key);
  } catch (err) {
    console.warn(`[Flags] Failed to invalidate cache for flag "${flagKey}":`, err);
  }
}
