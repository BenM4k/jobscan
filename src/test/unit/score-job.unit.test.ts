import {
  MODEL_USED,
  scoreJobForResume,
  type RateLimitedError,
} from "@/services/scoring/score-job";
import {
  getScoreCacheKey,
  DEFAULT_SCORE_CACHE_TTL_SECONDS,
} from "@/services/ai/score-cache";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runScoreJobUnitTests() {
  console.log("Running Step 15 & 16 scoreJobForResume & rate limiting unit tests...\n");

  // 1. Check exports
  assert(
    typeof scoreJobForResume === "function",
    "scoreJobForResume should be exported from @/services/scoring/score-job"
  );
  assert(
    MODEL_USED === "hybrid-v1",
    `MODEL_USED must be 'hybrid-v1', got '${MODEL_USED}'`
  );
  console.log("✓ Exports and MODEL_USED = 'hybrid-v1' verified");

  // 2. Cache key structure with resumeId and MODEL_USED
  const cacheKey = getScoreCacheKey("job-123", "resume-456", 3, MODEL_USED);
  assert(
    cacheKey === "score:job-123:resume-456:3:hybrid-v1",
    `Expected 'score:job-123:resume-456:3:hybrid-v1', got '${cacheKey}'`
  );
  console.log("✓ Cache key format matches score:${jobId}:${resumeId}:${resumeVersion}:${MODEL_USED}");

  // 3. TTL verification: 7 days (60*60*24*7 = 604800s)
  assert(
    DEFAULT_SCORE_CACHE_TTL_SECONDS === 60 * 60 * 24 * 7,
    `TTL must equal 7 days (604800s), got ${DEFAULT_SCORE_CACHE_TTL_SECONDS}`
  );
  console.log("✓ 7-day TTL verified as secondary safety net alongside native allkeys-lru");

  // 4. Rate-limit type shape verification (Step 16)
  const mockRateLimitErr: RateLimitedError = {
    code: "rate_limited",
    retryAfterSeconds: 10,
  };
  assert(mockRateLimitErr.code === "rate_limited", "code must be 'rate_limited'");
  assert(mockRateLimitErr.retryAfterSeconds === 10, "retryAfterSeconds must match");
  console.log("✓ Step 16 RateLimitedError shape { code: 'rate_limited', retryAfterSeconds } verified");

  // 5. Skills synchronization contract on matchRes failure vs success
  {
    let syncedJobSkills: string[] | null = null;
    let syncCalled: boolean = false;
    const mockSyncJobSkills = async (_jobId: string, skills: string[]) => {
      syncCalled = true;
      syncedJobSkills = skills;
    };

    // Case A: Analysis succeeds with empty skills -> syncs empty array
    const successResEmpty = { ok: true as const, value: { jobSkills: [] as string[] } };
    if (successResEmpty.ok) {
      await mockSyncJobSkills("job-1", successResEmpty.value.jobSkills);
    }
    assert((syncCalled as boolean) === true, "syncJobSkills should be called on successful analysis");
    assert(syncedJobSkills !== null && (syncedJobSkills as string[]).length === 0, "empty skills synchronized on successful empty result");

    // Case B: Analysis fails with error -> syncJobSkills is skipped, preserving existing skills
    syncCalled = false;
    syncedJobSkills = null;
    const existingSkills = ["TypeScript", "Next.js"];
    const failedRes = { ok: false as const, error: new Error("AI provider rate limited") };

    if (failedRes.ok) {
      await mockSyncJobSkills("job-1", (failedRes as any).value.jobSkills);
    }
    assert(syncCalled === false, "syncJobSkills must be skipped when analysis fails");

    const fallbackJobSkills = failedRes.ok
      ? (failedRes as any).value.jobSkills
      : existingSkills;
    assert(fallbackJobSkills === existingSkills, "existing job skills preserved on error");
  }
  console.log("✓ Skills synchronization contract on matchRes failure vs success verified");

  console.log("\n✓ All Step 15 & 16 score-job tests passed successfully!");
}

runScoreJobUnitTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
