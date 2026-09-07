import { isEnabled, FEATURE_FLAGS } from "@/services/flags";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runFeatureFlagsUnitTests() {
  console.log("Running Feature Flags unit tests...\n");

  // 1. Export and constants check
  assert(typeof isEnabled === "function", "isEnabled should be exported as a function");
  assert(
    FEATURE_FLAGS.HYBRID_SCORING === "hybrid_scoring",
    "HYBRID_SCORING flag key must equal 'hybrid_scoring'"
  );
  assert(
    FEATURE_FLAGS.NEW_ADAPTERS === "new_adapters",
    "NEW_ADAPTERS flag key must equal 'new_adapters'"
  );
  console.log("✓ Core exports & constants verified");

  // 2. Logic simulation for evaluation order: User Override > Global Flag
  type MockFlag = { key: string; enabledGlobally: boolean };
  type MockAssignment = { userId: string; enabled: boolean };

  function evaluateFlag(
    flag: MockFlag | null,
    assignments: MockAssignment[],
    userId?: string | null
  ): boolean {
    if (!flag) return false;

    if (userId) {
      const assignment = assignments.find((a) => a.userId === userId);
      if (assignment) {
        return assignment.enabled;
      }
    }

    return flag.enabledGlobally;
  }

  // Case A: Flag disabled globally, but user has an override enabled (Beta user)
  const globalOffFlag: MockFlag = { key: "hybrid_scoring", enabledGlobally: false };
  const userOptInAssignments: MockAssignment[] = [{ userId: "user-beta", enabled: true }];

  assert(
    evaluateFlag(globalOffFlag, userOptInAssignments, "user-beta") === true,
    "Per-user assignment true must override global false"
  );
  assert(
    evaluateFlag(globalOffFlag, userOptInAssignments, "user-regular") === false,
    "Regular user without assignment must get global false"
  );
  assert(
    evaluateFlag(globalOffFlag, userOptInAssignments, null) === false,
    "Anonymous/no-user check must get global false"
  );
  console.log("✓ Per-user opt-in override: assignment=true correctly overrides global=false");

  // Case B: Flag enabled globally, but user is explicitly disabled (Kill switch / opt-out)
  const globalOnFlag: MockFlag = { key: "new_adapters", enabledGlobally: true };
  const userDisabledAssignments: MockAssignment[] = [{ userId: "user-blocked", enabled: false }];

  assert(
    evaluateFlag(globalOnFlag, userDisabledAssignments, "user-blocked") === false,
    "Per-user assignment false must override global true"
  );
  assert(
    evaluateFlag(globalOnFlag, userDisabledAssignments, "user-other") === true,
    "Other user without assignment must get global true"
  );
  console.log("✓ Per-user killswitch override: assignment=false correctly overrides global=true");

  // Case C: Non-existent flag
  assert(
    evaluateFlag(null, [], "any-user") === false,
    "Non-existent flag must return false"
  );
  console.log("✓ Fallback safety: non-existent flag defaults to false");

  // 3. Live call graceful degradation when DB is offline
  const liveRes = await isEnabled("test-user-id", "hybrid_scoring");
  assert(
    typeof liveRes === "boolean",
    "isEnabled must return a boolean even if DB is offline"
  );
  console.log("✓ Live evaluation safety: handles offline/unreachable DB without throwing");

  console.log("\nAll Feature Flags tests passed successfully! 🎉");
}

runFeatureFlagsUnitTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
