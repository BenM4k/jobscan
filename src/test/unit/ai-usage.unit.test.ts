import { getUserAiUsage } from "@/services/ai/usage.service";
import { ok, err } from "@/lib/result";
import { AppError } from "@/lib/errors";

function assert(condition: unknown, msg: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runAiUsageUnitTests() {
  console.log("Running AI Usage calculation & service unit tests...\n");

  // 1. Standard usage computation
  const mockStandardSummary = async () => {
    return ok({
      usedCount: 20,
      monthlyLimit: 50,
      totalTokens: 15000,
      totalCostEstimateUsd: "0.0450",
      cacheHitCount: 3,
      periodStart: new Date(),
    });
  };

  const res = await getUserAiUsage("test-user-1", 50, {
    getUserAiUsageSummary: mockStandardSummary,
  });
  if (!res.ok) {
    throw new Error("Service must return ok Result");
  }
  assert(res.value.usedCount === 20, "usedCount must match DAL summary");
  assert(res.value.monthlyLimit === 50, "monthlyLimit must be 50");
  assert(
    res.value.remainingCount === 30,
    "remainingCount must be 50 - 20 = 30",
  );
  assert(
    res.value.percentUsed === 40,
    "percentUsed must be (20 / 50) * 100 = 40%",
  );
  assert(res.value.totalTokens === 15000, "totalTokens must match");
  assert(
    res.value.totalCostEstimateUsd === "0.0450",
    "costEstimate must match",
  );
  console.log(
    "✓ Standard computation: accurately calculates remaining calls and percent used",
  );

  // 2. Over-quota clamping computation
  const mockOverQuotaSummary = async () => {
    return ok({
      usedCount: 55,
      monthlyLimit: 50,
      totalTokens: 40000,
      totalCostEstimateUsd: "0.1200",
      cacheHitCount: 0,
      periodStart: new Date(),
    });
  };

  const overQuotaRes = await getUserAiUsage("test-user-2", 50, {
    getUserAiUsageSummary: mockOverQuotaSummary,
  });
  if (!overQuotaRes.ok) {
    throw new Error("Over-quota calculation returns ok Result");
  }
  assert(
    overQuotaRes.value.remainingCount === 0,
    "remainingCount must clamp to 0 when over quota",
  );
  assert(
    overQuotaRes.value.percentUsed === 100,
    "percentUsed must clamp to 100%",
  );
  console.log(
    "✓ Over-quota clamping: clamps remainingCount to 0 and percentUsed to 100%",
  );

  // 3. Error propagation from DAL
  const mockErrorSummary = async () => {
    return err(new AppError("DB_ERROR", "Database connection lost"));
  };

  const errRes = await getUserAiUsage("test-user-err", 50, {
    getUserAiUsageSummary: mockErrorSummary,
  });
  if (errRes.ok) {
    throw new Error("DAL error must propagate as err Result");
  }
  assert(errRes.error.code === "DB_ERROR", "Error code must be preserved");
  console.log(
    "✓ Error propagation: safely returns error Result on DAL failure",
  );

  // 4. Validation of non-positive monthly limit
  const zeroLimitRes = await getUserAiUsage("test-user-limit", 0);
  if (zeroLimitRes.ok) {
    throw new Error("monthlyLimit <= 0 must return an err Result");
  }
  assert(
    zeroLimitRes.error.code === "VALIDATION_ERROR",
    "Error code must be VALIDATION_ERROR",
  );

  const negLimitRes = await getUserAiUsage("test-user-limit", -5);
  if (negLimitRes.ok) {
    throw new Error("Negative monthlyLimit must return an err Result");
  }
  assert(
    negLimitRes.error.code === "VALIDATION_ERROR",
    "Error code must be VALIDATION_ERROR",
  );
  console.log(
    "✓ Limit validation: rejects zero or negative monthly limits before calculation",
  );

  console.log("\nAll AI Usage unit tests passed successfully! 🎉");
}

runAiUsageUnitTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
