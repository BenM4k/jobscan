import {
  getRateLimitKey,
  checkRateLimit,
  checkAiRateLimit,
  DEFAULT_AI_RATE_LIMITS,
} from "@/services/ai/rate-limit";
import { clearLocalRateLimitBuckets, redis } from "@/services/cache/redis-client";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runRateLimitUnitTests() {
  console.log("Running Step 16 Token-Bucket Rate Limiter unit tests...\n");
  clearLocalRateLimitBuckets();

  // 1. Key format verification
  const key = getRateLimitKey("usr-123", "scoring");
  assert(
    key === "ratelimit:usr-123:scoring",
    `Expected 'ratelimit:usr-123:scoring', got '${key}'`
  );
  console.log("✓ Key format matches ratelimit:${userId}:${aiFeature}");

  // 2. Step 16 feature configurations check
  assert(
    DEFAULT_AI_RATE_LIMITS.scoring.capacity === 20,
    `Scoring should have capacity of 20, got ${DEFAULT_AI_RATE_LIMITS.scoring.capacity}`
  );
  assert(
    DEFAULT_AI_RATE_LIMITS.scoring.refillRatePerSec === 0.1,
    `Scoring refill rate should be 0.1 (1 token/10s), got ${DEFAULT_AI_RATE_LIMITS.scoring.refillRatePerSec}`
  );

  assert(
    DEFAULT_AI_RATE_LIMITS.tailored_resume.capacity === 5,
    "Tailored resume should have capacity of 5"
  );
  assert(
    Math.abs(DEFAULT_AI_RATE_LIMITS.tailored_resume.refillRatePerSec - 1 / 60) < 1e-6,
    `Tailored resume refill rate should be 1/60 (1 token/60s), got ${DEFAULT_AI_RATE_LIMITS.tailored_resume.refillRatePerSec}`
  );

  assert(
    DEFAULT_AI_RATE_LIMITS.tailored_cover_letter.capacity === 5,
    "Tailored cover letter should have capacity of 5"
  );
  assert(
    Math.abs(DEFAULT_AI_RATE_LIMITS.tailored_cover_letter.refillRatePerSec - 1 / 60) < 1e-6,
    `Tailored cover letter refill rate should be 1/60 (1 token/60s), got ${DEFAULT_AI_RATE_LIMITS.tailored_cover_letter.refillRatePerSec}`
  );
  console.log("✓ Step 16 Rate limit tiers verified: scoring (20 burst, 1/10s), tailored_resume & cover_letter (5 burst, 1/60s)");

  // 3. checkRateLimit shape check & bounded local fallback when Redis is rejected or unavailable
  const origEval = (redis as any).eval;
  const origUrl = process.env.UPSTASH_REDIS_REST_URL;
  const origToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  try {
    process.env.UPSTASH_REDIS_REST_URL = "https://mock.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "mock-token";
    (redis as any).eval = async () => {
      throw new Error("Redis connection refused (ECONNREFUSED)");
    };

    const res = await checkRateLimit("user-test", "scoring");
    assert(typeof res.allowed === "boolean", "allowed must be boolean");
    if (!res.allowed) {
      assert(
        typeof res.retryAfterSeconds === "number",
        "retryAfterSeconds must be number when allowed is false"
      );
    }
    assert(
      res.allowed === true,
      "Must allow initial request via bounded local limiter when Redis dependency is rejected/unavailable"
    );
    console.log("✓ checkRateLimit returns { allowed: true } with bounded fallback when Redis is forced into rejected state");
  } finally {
    (redis as any).eval = origEval;
    if (origUrl !== undefined) {
      process.env.UPSTASH_REDIS_REST_URL = origUrl;
    } else {
      delete process.env.UPSTASH_REDIS_REST_URL;
    }
    if (origToken !== undefined) {
      process.env.UPSTASH_REDIS_REST_TOKEN = origToken;
    } else {
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
    }
  }

  // 4. Bounded local fallback: Redis unavailability must NOT permit unlimited cost-bearing requests
  // Test tailored_resume with capacity 5: 5 rapid requests should succeed, 6th must be rejected
  const resumeUserId = "user-burst-test";
  for (let i = 0; i < 5; i++) {
    const burstRes = await checkRateLimit(resumeUserId, "tailored_resume");
    assert(burstRes.allowed === true, `Burst request #${i + 1} within capacity 5 must be allowed`);
  }
  const blockedRes = await checkRateLimit(resumeUserId, "tailored_resume");
  assert(blockedRes.allowed === false, "6th burst request exceeding capacity 5 must be blocked");
  if (!blockedRes.allowed) {
    assert(
      blockedRes.retryAfterSeconds > 0,
      `retryAfterSeconds must be > 0 when blocked, got ${blockedRes.retryAfterSeconds}`
    );
  }
  console.log("✓ Bounded local fallback enforces capacity limit when Redis is offline (prevents unlimited AI requests)");

  // 4. Backward compatibility with checkAiRateLimit
  const aiRes = await checkAiRateLimit("user-test", "scoring");
  assert(aiRes.allowed === true, "checkAiRateLimit must also succeed and fail open");
  assert(aiRes.key === "ratelimit:user-test:scoring", "checkAiRateLimit returns key");
  console.log("✓ checkAiRateLimit backwards-compatibility verified");

  // 5. Token-bucket calculation logic simulation for Step 16 rates
  function simulateTokenBucket(
    currentTokens: number,
    capacity: number,
    refillRate: number,
    cost: number,
    elapsedSeconds: number
  ) {
    const refilled = Math.min(capacity, currentTokens + elapsedSeconds * refillRate);
    if (refilled >= cost) {
      return {
        allowed: true,
        remaining: refilled - cost,
        retryAfter: 0,
      };
    }
    return {
      allowed: false,
      remaining: refilled,
      retryAfter: Math.ceil((cost - refilled) / refillRate),
    };
  }

  // Scoring: Bucket full (20 tokens), cost 1
  const step1 = simulateTokenBucket(20, 20, 0.1, 1, 0);
  assert(step1.allowed === true, "Full bucket must allow request");
  assert(step1.remaining === 19, "Remaining tokens must be 19");

  // Scoring: Bucket exhausted (0 tokens), cost 1, 0s elapsed
  const step2 = simulateTokenBucket(0, 20, 0.1, 1, 0);
  assert(step2.allowed === false, "Empty bucket must reject request");
  assert(step2.retryAfter === 10, `Expected 10s retry after (1 token / 0.1 rate), got ${step2.retryAfter}`);

  // Scoring: Bucket empty (0 tokens), cost 1, 10s elapsed -> refills 1 token -> allowed
  const step3 = simulateTokenBucket(0, 20, 0.1, 1, 10);
  assert(step3.allowed === true, "Refilled bucket must allow request");
  assert(step3.remaining >= 0, "Remaining tokens should be non-negative");

  // Tailored Resume: Bucket exhausted (0 tokens), cost 1, refill 1/60s
  const step4 = simulateTokenBucket(0, 5, 1 / 60, 1, 0);
  assert(step4.allowed === false, "Empty resume bucket must reject request");
  assert(step4.retryAfter === 60, `Expected 60s retry after (1 token / (1/60) rate), got ${step4.retryAfter}`);

  console.log("✓ Token-bucket mechanics: capacity, refill rates, and retry-after calculation verified");

  console.log("\nAll Step 16 Token-Bucket Rate Limiter tests passed successfully! 🎉");
}

runRateLimitUnitTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
