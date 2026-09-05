import "dotenv/config";
import { db } from "@/services/db";
import { user, idempotencyKey } from "@/services/db/schema";
import * as idempotencyDal from "@/dal/idempotency.dal";
import { runWithIdempotency } from "./idempotency.service";
import { ok } from "@/lib/result";
import { eq } from "drizzle-orm";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function retryOp<T>(op: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await op();
    } catch (err) {
      lastErr = err;
      console.warn(`Transient DB operation failed (attempt ${i + 1}/${maxRetries}), retrying in 1s...`);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw lastErr;
}

async function runTests() {
  console.log("Starting idempotency tests...");

  // 1. Create a test user for foreign key constraint
  console.log("Creating test user in DB...");
  const testUserId = crypto.randomUUID();
  const testEmail = `idempotency-test-${Date.now()}@example.com`;

  await retryOp(async () => {
    await db.insert(user).values({
      id: testUserId,
      email: testEmail,
      name: "Test User",
      emailVerified: true,
    });
  });
  console.log("Test user created successfully:", testUserId);

  try {
    // ------------------------------------------------------------------------
    // Test 1: DAL beginIdempotentAction transitions
    // ------------------------------------------------------------------------
    console.log("Test 1: Testing DAL begin, conflict, completed, and failed retry...");
    const key1 = crypto.randomUUID();
    const action1 = "run_scoring";

    // First attempt should be locked
    const begin1 = await idempotencyDal.beginIdempotentAction(testUserId, action1, key1);
    assert(begin1.ok, "begin1 should succeed");
    if (!begin1.ok || begin1.value.type !== "locked") return;
    assert(begin1.value.type === "locked", "begin1 type should be locked");
    const record1 = begin1.value.record;

    // Concurrent attempt should see in_progress
    const beginConcurrent = await idempotencyDal.beginIdempotentAction(testUserId, action1, key1);
    assert(beginConcurrent.ok, "beginConcurrent should succeed");
    if (!beginConcurrent.ok) return;
    assert(beginConcurrent.value.type === "in_progress", "beginConcurrent type should be in_progress");

    // Complete record1
    const resultRef1 = crypto.randomUUID();
    const complete1 = await idempotencyDal.completeIdempotentAction(
      record1.id,
      record1.attemptId,
      resultRef1
    );
    assert(complete1.ok, "complete1 should succeed");
    if (!complete1.ok) return;
    assert(complete1.value.status === "completed", "record status should be completed");
    assert(complete1.value.resultRef === resultRef1, "resultRef should match");

    // Duplicate attempt should now see completed
    const beginCompleted = await idempotencyDal.beginIdempotentAction(testUserId, action1, key1);
    assert(beginCompleted.ok, "beginCompleted should succeed");
    if (!beginCompleted.ok) return;
    assert(beginCompleted.value.type === "completed", "beginCompleted type should be completed");

    // Test failure retry
    const keyFail = crypto.randomUUID();
    const beginFail = await idempotencyDal.beginIdempotentAction(testUserId, action1, keyFail);
    assert(beginFail.ok && beginFail.value.type === "locked", "beginFail should be locked");
    if (!beginFail.ok || beginFail.value.type !== "locked") return;

    await idempotencyDal.failIdempotentAction(beginFail.value.record.id, beginFail.value.attemptId);
    const retryFail = await idempotencyDal.beginIdempotentAction(testUserId, action1, keyFail);
    assert(retryFail.ok && retryFail.value.type === "locked", "failed action should be reclaimable for retry");

    console.log("✓ Test 1 passed: DAL transitions work correctly.");

    // ------------------------------------------------------------------------
    // Test 2: runWithIdempotency orchestration
    // ------------------------------------------------------------------------
    console.log("Test 2: Testing runWithIdempotency wrapper...");
    const key2 = crypto.randomUUID();
    const action2 = "generate_tailored_resume";
    let executeCalls = 0;

    // First invocation: should execute and complete
    const res1 = await runWithIdempotency({
      userId: testUserId,
      action: action2,
      key: key2,
      execute: async () => {
        executeCalls++;
        return ok({ data: { message: "tailored resume generated" }, resultRef: crypto.randomUUID() });
      },
      resolveExisting: async () => {
        return ok({ message: "tailored resume from cache" });
      },
    });

    assert(res1.ok, "res1 should be ok");
    if (!res1.ok) return;
    assert(res1.value.isCached === false, "res1 should not be cached");
    assert(res1.value.data.message === "tailored resume generated", "data matches");
    assert(executeCalls === 1, "execute should have been called once");

    // Duplicate invocation: should resolve from cache WITHOUT calling execute()
    const res2 = await runWithIdempotency({
      userId: testUserId,
      action: action2,
      key: key2,
      execute: async () => {
        executeCalls++;
        return ok({ data: { message: "tailored resume duplicate" }, resultRef: crypto.randomUUID() });
      },
      resolveExisting: async () => {
        return ok({ message: "tailored resume from cache" });
      },
    });

    assert(res2.ok, "res2 should be ok");
    if (!res2.ok) return;
    assert(res2.value.isCached === true, "res2 should be cached");
    assert(res2.value.data.message === "tailored resume from cache", "data resolved from cache");
    assert(executeCalls === 1, "execute MUST NOT be called on duplicate completed key");

    console.log("✓ Test 2 passed: duplicate calls are safely cached and do not re-run paid mutations.");

    // ------------------------------------------------------------------------
    // Test 3: Key validation (reject missing or non-UUID keys)
    // ------------------------------------------------------------------------
    console.log("Test 3: Testing idempotency key validation...");
    const missingRes = await runWithIdempotency({
      userId: testUserId,
      action: "run_scoring",
      key: null,
      execute: async () => ok({ data: "ok" }),
      resolveExisting: async () => ok("ok"),
    });
    assert(!missingRes.ok, "missing key must fail");
    assert(missingRes.ok === false && missingRes.error.code === "MISSING_IDEMPOTENCY_KEY", "code matches");

    const invalidRes = await runWithIdempotency({
      userId: testUserId,
      action: "run_scoring",
      key: "not-a-uuid-123",
      execute: async () => ok({ data: "ok" }),
      resolveExisting: async () => ok("ok"),
    });
    assert(!invalidRes.ok, "invalid key format must fail");
    assert(invalidRes.ok === false && invalidRes.error.code === "INVALID_IDEMPOTENCY_KEY", "code matches");

    console.log("✓ Test 3 passed: missing/invalid keys are strictly rejected.");

    // ------------------------------------------------------------------------
    // Test 4: Concurrent reclaims (failed and stale rows)
    // ------------------------------------------------------------------------
    console.log("Test 4: Testing concurrent reclaims for failed action...");
    const keyReclaim = crypto.randomUUID();
    const actionReclaim = "test_reclaim_action";
    const initialAttemptId = crypto.randomUUID();

    // Seed a failed record
    await db.insert(idempotencyKey).values({
      userId: testUserId,
      action: actionReclaim,
      key: keyReclaim,
      status: "failed",
      attemptId: initialAttemptId,
    });

    // Launch concurrent reclaims simultaneously
    const [reclaim1, reclaim2] = await Promise.all([
      idempotencyDal.beginIdempotentAction(testUserId, actionReclaim, keyReclaim),
      idempotencyDal.beginIdempotentAction(testUserId, actionReclaim, keyReclaim),
    ]);

    assert(reclaim1.ok && reclaim2.ok, "both reclaim attempts should succeed at DB level");
    if (!reclaim1.ok || !reclaim2.ok) return;

    const lockedCount = [reclaim1.value.type, reclaim2.value.type].filter((t) => t === "locked").length;
    const inProgressCount = [reclaim1.value.type, reclaim2.value.type].filter((t) => t === "in_progress").length;

    assert(lockedCount === 1, `Expected exactly 1 locked caller, got ${lockedCount}`);
    assert(inProgressCount === 1, `Expected exactly 1 in_progress caller, got ${inProgressCount}`);

    console.log("✓ Test 4 passed: exactly one concurrent caller obtained the lease on reclaim.");

    console.log("\nALL IDEMPOTENCY TESTS PASSED SUCCESSFULLY! 🎉");
  } finally {
    // Cleanup test records
    await db.delete(idempotencyKey).where(eq(idempotencyKey.userId, testUserId));
    await db.delete(user).where(eq(user.id, testUserId));
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test failed with error:", err);
    process.exit(1);
  });
