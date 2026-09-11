import "server-only";
import {
  executeTokenBucketRateLimit,
  type TokenBucketRateLimitResult,
} from "@/services/cache/redis-client";
import type { AiFeature } from "@/dal/ops.dal";

export interface RateLimitConfig {
  capacity: number;
  refillRatePerSec: number;
  cost?: number;
}

export type AiRateLimitFeature =
  | "scoring"
  | "tailored_resume"
  | "tailored_cover_letter"
  | "interview_prep"
  | "explanation";

/**
 * Step 16: Per-feature token-bucket rate limiters.
 * - scoring: burst capacity 20, 1 token/10s refill (0.1/s)
 * - tailored_resume: burst capacity 5, 1 token/60s refill (1/60 /s)
 * - tailored_cover_letter: burst capacity 5, 1 token/60s refill (1/60 /s)
 */
export const DEFAULT_AI_RATE_LIMITS: Record<AiFeature, RateLimitConfig> = {
  scoring: {
    capacity: 20,
    refillRatePerSec: 0.1, // 1 token every 10 seconds
    cost: 1,
  },
  tailored_resume: {
    capacity: 5,
    refillRatePerSec: 1 / 60, // 1 token every 60 seconds
    cost: 1,
  },
  tailored_cover_letter: {
    capacity: 5,
    refillRatePerSec: 1 / 60, // 1 token every 60 seconds
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

export const AI_RATE_LIMIT_CONFIGS = DEFAULT_AI_RATE_LIMITS;

/**
 * Generate namespaced Redis key for rate limiting.
 * Format: ratelimit:${userId}:${feature}
 */
export function getRateLimitKey(userId: string, feature: string): string {
  return `ratelimit:${userId}:${feature}`;
}

export type RateLimitResult =
  | { allowed: true; remaining?: number }
  | { allowed: false; retryAfterSeconds: number; remaining?: number };

export interface RateLimitCheckResult extends TokenBucketRateLimitResult {
  key: string;
  feature: string;
}

/**
 * Step 16: Check rate limit for a user and feature.
 * Returns { allowed: true } or { allowed: false, retryAfterSeconds }.
 * Fails open gracefully if Redis is unconfigured or offline.
 */
export async function checkRateLimit(
  userId: string,
  feature: AiRateLimitFeature | string,
  customConfig?: Partial<RateLimitConfig>
): Promise<RateLimitResult> {
  const baseConfig =
    feature in DEFAULT_AI_RATE_LIMITS
      ? DEFAULT_AI_RATE_LIMITS[feature as AiFeature]
      : { capacity: 20, refillRatePerSec: 0.1, cost: 1 };

  const capacity = customConfig?.capacity ?? baseConfig.capacity;
  const refillRatePerSec =
    customConfig?.refillRatePerSec ?? baseConfig.refillRatePerSec;
  const cost = customConfig?.cost ?? baseConfig.cost ?? 1;

  const key = getRateLimitKey(userId, feature);
  const result = await executeTokenBucketRateLimit(
    key,
    capacity,
    refillRatePerSec,
    cost
  );

  if (!result.allowed) {
    return {
      allowed: false,
      retryAfterSeconds: result.retryAfterSeconds,
      remaining: result.remaining,
    };
  }

  return {
    allowed: true,
    remaining: result.remaining,
  };
}

/**
 * Check rate limit and return rich metadata (backwards compatibility with checkAiRateLimit).
 */
export async function checkAiRateLimit(
  userId: string,
  feature: AiFeature | string,
  customConfig?: Partial<RateLimitConfig>
): Promise<RateLimitCheckResult> {
  const baseConfig =
    feature in DEFAULT_AI_RATE_LIMITS
      ? DEFAULT_AI_RATE_LIMITS[feature as AiFeature]
      : { capacity: 20, refillRatePerSec: 0.1, cost: 1 };

  const capacity = customConfig?.capacity ?? baseConfig.capacity;
  const refillRatePerSec =
    customConfig?.refillRatePerSec ?? baseConfig.refillRatePerSec;
  const cost = customConfig?.cost ?? baseConfig.cost ?? 1;

  const key = getRateLimitKey(userId, feature);
  const result = await executeTokenBucketRateLimit(
    key,
    capacity,
    refillRatePerSec,
    cost
  );

  return {
    ...result,
    key,
    feature,
  };
}
