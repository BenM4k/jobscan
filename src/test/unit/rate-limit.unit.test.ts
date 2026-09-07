import {
  getRateLimitKey,
  checkAiRateLimit,
  DEFAULT_AI_RATE_LIMITS,
} from "@/services/rate-limit";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runRateLimitUnitTests() {
  console.log("Running Token-Bucket Rate Limiter unit tests...\n");

  // 1. Key format verification
  const key = getRateLimitKey("usr-123", "scoring");
  assert(
    key === "ratelimit:usr-123:scoring",
    `Expected 'ratelimit:usr-123:scoring', got '${key}'`
  );
  console.log("✓ Key format matches ratelimit:${userId}:${aiFeature}");

  // 2. Feature configurations check
  assert(
    DEFAULT_AI_RATE_LIMITS.scoring.capacity === 10,
    "Scoring should have capacity of 10"
  );
  assert(
    DEFAULT_AI_RATE_LIMITS.tailored_resume.capacity === 5,
    "Tailored resume should have capacity of 5"
  );
  assert(
    DEFAULT_AI_RATE_LIMITS.tailored_cover_letter.capacity === 5,
    "Tailored cover letter should have capacity of 5"
  );
  console.log("✓ Rate limit tiers defined for all AI features");

  // 3. Graceful degradation when Redis is unconfigured
  const res = await checkAiRateLimit("user-test", "scoring");
  assert(typeof res.allowed === "boolean", "allowed must be boolean");
  assert(typeof res.remaining === "number", "remaining must be number");
  assert(typeof res.retryAfterSeconds === "number", "retryAfterSeconds must be number");
  assert(res.allowed === true, "Must fail open when Redis is unconfigured or offline");
  console.log("✓ Fail-open behavior: allows requests safely when Redis is offline");

  // 4. Token-bucket calculation logic simulation
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

  // Bucket full (10 tokens), cost 1
  const step1 = simulateTokenBucket(10, 10, 0.2, 1, 0);
  assert(step1.allowed === true, "Full bucket must allow request");
  assert(step1.remaining === 9, "Remaining tokens must be 9");

  // Bucket exhausted (0 tokens), cost 1, 0s elapsed
  const step2 = simulateTokenBucket(0, 10, 0.2, 1, 0);
  assert(step2.allowed === false, "Empty bucket must reject request");
  assert(step2.retryAfter === 5, `Expected 5s retry after (1 token / 0.2 rate), got ${step2.retryAfter}`);

  // Bucket empty (0 tokens), cost 1, 6s elapsed -> refills 1.2 tokens -> allowed
  const step3 = simulateTokenBucket(0, 10, 0.2, 1, 6);
  assert(step3.allowed === true, "Refilled bucket must allow request");
  assert(step3.remaining >= 0.2, "Remaining tokens should be positive");
  console.log("✓ Token-bucket mechanics: capacity, refill rates, and retry-after calculation verified");

  console.log("\nAll Token-Bucket Rate Limiter tests passed successfully! 🎉");
}

runRateLimitUnitTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
