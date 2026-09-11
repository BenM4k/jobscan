import {
  isFeatureEnabled,
  getFeatureFlagCacheKey,
  invalidateFeatureFlagCache,
  FEATURE_FLAG_CACHE_TTL_SECONDS,
} from "@/services/flags/is-enabled";
import { isAdmin } from "@/services/auth/admin";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runFeatureFlagsUnitTests() {
  console.log("Running Step 18 Feature Flags unit tests...\n");

  // 1. Cache key format & TTL
  assert(
    FEATURE_FLAG_CACHE_TTL_SECONDS === 60,
    `Cache TTL should be 60 seconds, got ${FEATURE_FLAG_CACHE_TTL_SECONDS}`
  );
  const cacheKeyWithUser = getFeatureFlagCacheKey("hybrid-scoring-v1", "usr-123");
  assert(
    cacheKeyWithUser === "flag:hybrid-scoring-v1:usr-123",
    `Expected 'flag:hybrid-scoring-v1:usr-123', got '${cacheKeyWithUser}'`
  );
  const cacheKeyAnon = getFeatureFlagCacheKey("hybrid-scoring-v1", null);
  assert(
    cacheKeyAnon === "flag:hybrid-scoring-v1:anon",
    `Expected 'flag:hybrid-scoring-v1:anon', got '${cacheKeyAnon}'`
  );
  console.log("✓ Cache key format (flag:${flagKey}:${userId}) and 60-second TTL verified");

  // 2. Fails CLOSED on unknown flag key
  const unknownResult = await isFeatureEnabled("usr-123", "non-existent-feature-xyz");
  assert(
    unknownResult === false,
    "Unknown feature flags must fail CLOSED (return false)"
  );
  console.log("✓ Fail CLOSED behavior: unknown flag keys return false");

  // 3. Graceful degradation when Redis is offline
  // Since Redis is not running or unconfigured in this test process, isFeatureEnabled must not throw
  const res = await isFeatureEnabled(null, "hybrid-scoring-v1");
  assert(
    typeof res === "boolean",
    "isFeatureEnabled must return a boolean even if Redis is unconfigured"
  );
  console.log("✓ Fail-open / graceful degradation: Redis absence does not throw");

  // 4. Cache invalidation does not throw
  await invalidateFeatureFlagCache("hybrid-scoring-v1", "usr-123");
  console.log("✓ invalidateFeatureFlagCache executes safely without throwing");

  // 5. Admin access stopgap check
  process.env.ADMIN_USER_IDS = "admin-1, admin-2,admin-3";
  assert(isAdmin({ id: "admin-1" }) === true, "admin-1 should be admin");
  assert(isAdmin("admin-2") === true, "admin-2 should be admin");
  assert(isAdmin({ id: "regular-user" }) === false, "regular-user should NOT be admin");
  assert(isAdmin(null) === false, "null user should NOT be admin");
  console.log("✓ Admin stopgap access verified via ADMIN_USER_IDS env var check");

  console.log("\nAll Step 18 Feature Flags tests passed successfully! 🎉");
}

runFeatureFlagsUnitTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
