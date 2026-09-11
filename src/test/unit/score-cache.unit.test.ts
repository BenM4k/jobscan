import {
  getScoreCacheKey,
  getCachedScore,
  setCachedScore,
  invalidateCachedScore,
  DEFAULT_SCORE_CACHE_TTL_SECONDS,
} from "@/services/ai/score-cache";
import type { ScoreResult } from "@/services/scoring/types";
import { closeRedisConnection } from "@/services/cache/redis-client";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runScoreCacheUnitTests() {
  console.log("Running AI Score Cache unit tests...\n");

  // 1. Key format verification
  const key1 = getScoreCacheKey("job-abc", "resume-xyz", 1, "gemini-3.8-flash");
  assert(
    key1 === "score:job-abc:resume-xyz:1:gemini-3.8-flash",
    `Expected 'score:job-abc:resume-xyz:1:gemini-3.8-flash', got '${key1}'`
  );
  console.log("✓ Key format matches score:${jobId}:${resumeId}:${resumeVersion}:${modelVersion}");

  // 2. Resume isolation: different resumes cannot share cache entries even with same version
  const keyResumeA = getScoreCacheKey("job-100", "res-a", 1, "gpt-4o");
  const keyResumeB = getScoreCacheKey("job-100", "res-b", 1, "gpt-4o");
  assert(
    keyResumeA !== keyResumeB,
    "Different resumes with the same version must generate distinct cache keys"
  );
  assert(
    keyResumeB === "score:job-100:res-b:1:gpt-4o",
    `Expected score:job-100:res-b:1:gpt-4o, got ${keyResumeB}`
  );
  console.log("✓ Resume isolation: different resumes cannot share score-cache entries");

  // 3. Cache busting via resumeVersion
  const keyV1 = getScoreCacheKey("job-100", "res-a", 1, "gpt-4o");
  const keyV2 = getScoreCacheKey("job-100", "res-a", 2, "gpt-4o");
  assert(
    keyV1 !== keyV2,
    "Incrementing resumeVersion must generate a new cache key (cache busting)"
  );
  assert(keyV2 === "score:job-100:res-a:2:gpt-4o", `Expected score:job-100:res-a:2:gpt-4o, got ${keyV2}`);
  console.log("✓ Cache busting: resumeVersion isolates scores across master resume updates");

  // 4. Model version isolation
  const keyGemini = getScoreCacheKey("job-100", "res-a", 1, "gemini-3.8-flash");
  const keyClaude = getScoreCacheKey("job-100", "res-a", 1, "claude-3-5-sonnet-latest");
  assert(
    keyGemini !== keyClaude,
    "Different model versions must not collide in the score cache"
  );
  console.log("✓ Model isolation: scores are segregated by modelVersion");

  // 5. TTL default verification
  assert(
    DEFAULT_SCORE_CACHE_TTL_SECONDS === 604800,
    `Expected 604800 seconds (7 days), got ${DEFAULT_SCORE_CACHE_TTL_SECONDS}`
  );
  console.log("✓ TTL configuration: defaults to 7 days for LRU/LFU cache policies");

  // 6. Graceful degradation when Redis is unconfigured or offline
  const mockScore: ScoreResult = {
    fitScore: 88,
    explanation: "Strong match for TypeScript and distributed systems.",
    scoreReasoning: "Matches requirements well.",
    jobSkills: ["TypeScript", "Next.js"],
    resumeSkills: ["TypeScript", "React"],
    coverLetterDraft: "Dear Hiring Manager...",
    tailoredResume: "Senior Full Stack Engineer...",
    matchedSkills: ["TypeScript"],
    missingSkills: ["Next.js"],
  };

  const originalRedisUrl = process.env.REDIS_URL;
  try {
    delete process.env.REDIS_URL;
    await closeRedisConnection();

    // Should not throw even when Redis is offline / unconfigured
    await setCachedScore("job-test", "res-test", 1, "test-model", mockScore);
    const fetched = await getCachedScore("job-test", "res-test", 1, "test-model");
    // In offline mode, get returns null gracefully
    assert(fetched === null, "getCachedScore must return null when Redis is offline / unconfigured");

    await invalidateCachedScore("job-test", "res-test", 1, "test-model");
    console.log("✓ Graceful operations: set, get, invalidate operate safely offline");
  } finally {
    if (originalRedisUrl !== undefined) {
      process.env.REDIS_URL = originalRedisUrl;
    }
  }

  console.log("\nAll AI Score Cache tests passed successfully! 🎉");
}

runScoreCacheUnitTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
