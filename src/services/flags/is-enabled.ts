import "server-only";
import * as flagsDal from "@/dal/flags.dal";
import { cacheGet, cacheSet, cacheDel, getRedisClient } from "@/services/cache/redis-client";

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
  let hasUserAssignment = false;
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
        hasUserAssignment = true;
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
    if (!userId) {
      // Anonymous / global evaluation
      await cacheSet(cacheKey, enabled, FEATURE_FLAG_CACHE_TTL_SECONDS);
    } else {
      // Cache user evaluation
      await cacheSet(cacheKey, enabled, FEATURE_FLAG_CACHE_TTL_SECONDS);

      // Track evaluated user so global flag invalidation purges all affected user evaluations
      const client = getRedisClient();
      if (client) {
        await client.sadd(`flag:${flagKey}:users`, userId).catch(() => {});
        await client.expire(`flag:${flagKey}:users`, FEATURE_FLAG_CACHE_TTL_SECONDS).catch(() => {});
      }

      // If globally-derived, also warm the global/anonymous cache entry
      if (!hasUserAssignment) {
        const anonKey = getFeatureFlagCacheKey(flagKey, null);
        await cacheSet(anonKey, enabled, FEATURE_FLAG_CACHE_TTL_SECONDS);
      }
    }
  } catch (err) {
    console.warn(`[Flags] Redis cache write failed for "${cacheKey}":`, err);
  }

  return enabled;
}

/**
 * Invalidate the Redis cache for a user's feature flag evaluation or all evaluations on global change.
 * When userId is null/undefined (global change flow), purges the anonymous entry AND all affected user evaluations.
 */
export async function invalidateFeatureFlagCache(
  flagKey: string,
  userId?: string | null
): Promise<void> {
  try {
    if (userId) {
      const key = getFeatureFlagCacheKey(flagKey, userId);
      await cacheDel(key);
      const client = getRedisClient();
      if (client) {
        await client.srem(`flag:${flagKey}:users`, userId).catch(() => {});
      }
    } else {
      // Global flag-change flow: invalidate anonymous entry and all cached user evaluations
      const anonKey = getFeatureFlagCacheKey(flagKey, null);
      const keysToDel: string[] = [anonKey];
      const client = getRedisClient();
      if (client) {
        const users = await client.smembers(`flag:${flagKey}:users`).catch(() => []);
        if (Array.isArray(users) && users.length > 0) {
          for (const u of users) {
            keysToDel.push(getFeatureFlagCacheKey(flagKey, u));
          }
        }
        keysToDel.push(`flag:${flagKey}:users`);
      }
      await cacheDel(...keysToDel);
    }
  } catch (err) {
    console.warn(`[Flags] Failed to invalidate cache for flag "${flagKey}":`, err);
  }
}
