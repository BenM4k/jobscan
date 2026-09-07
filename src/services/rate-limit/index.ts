import "server-only";
import { executeTokenBucketRateLimit, type TokenBucketRateLimitResult } from "@/services/cache/redis-client";
import type { AiFeature } from "@/dal/ops.dal";

export interface RateLimitConfig {
  capacity: number;
  refillRatePerSec: number;
  cost?: number;
}

export interface RateLimitCheckResult extends TokenBucketRateLimitResult {
  key: string;
  feature: string;
}

/**
 * Default token-bucket configurations per AI feature.
 */
export const DEFAULT_AI_RATE_LIMITS: Record<AiFeature, RateLimitConfig> = {
  scoring: {
    capacity: 10,
    refillRatePerSec: 0.2, // 1 token every 5 seconds (12 / minute)
    cost: 1,
  },
  tailored_resume: {
    capacity: 5,
    refillRatePerSec: 0.1, // 1 token every 10 seconds (6 / minute)
    cost: 1,
  },
  tailored_cover_letter: {
    capacity: 5,
    refillRatePerSec: 0.1, // 1 token every 10 seconds (6 / minute)
    cost: 1,
  },
  interview_prep: {
    capacity: 5,
    refillRatePerSec: 0.1,
    cost: 1,
  },
  explanation: {
    capacity: 15,
    refillRatePerSec: 0.5,
    cost: 1,
  },
};

/**
 * Generate namespaced Redis key for rate limiting.
 * Format: ratelimit:${userId}:${feature}
 */
export function getRateLimitKey(userId: string, feature: string): string {
  return `ratelimit:${userId}:${feature}`;
}

/**
 * Check if an AI action is permitted under the token-bucket rate limiter.
 * Must be checked at the very top of each AI-calling action before idempotency validation.
 */
export async function checkAiRateLimit(
  userId: string,
  feature: AiFeature | string,
  customConfig?: Partial<RateLimitConfig>
): Promise<RateLimitCheckResult> {
  const baseConfig =
    (feature in DEFAULT_AI_RATE_LIMITS
      ? DEFAULT_AI_RATE_LIMITS[feature as AiFeature]
      : { capacity: 10, refillRatePerSec: 0.2, cost: 1 });

  const capacity = customConfig?.capacity ?? baseConfig.capacity;
  const refillRatePerSec = customConfig?.refillRatePerSec ?? baseConfig.refillRatePerSec;
  const cost = customConfig?.cost ?? baseConfig.cost ?? 1;

  const key = getRateLimitKey(userId, feature);
  const result = await executeTokenBucketRateLimit(key, capacity, refillRatePerSec, cost);

  return {
    ...result,
    key,
    feature,
  };
}
