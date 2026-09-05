import { runWithIdempotency, type IdempotencyKeySelect } from "./idempotency.service";
import { ok, err } from "@/lib/result";
import { AppError } from "@/lib/errors";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runUnitTests() {
  console.log("Running unit tests for runWithIdempotency (zero-dependency / mocked DAL)...");

  const testUserId = crypto.randomUUID();
  const validKey = crypto.randomUUID();

  // 1. Rejection of missing key
  const missingRes = await runWithIdempotency({
    userId: testUserId,
    action: "run_scoring",
    key: null,
    execute: async () => ok({ data: "ok" }),
    resolveExisting: async () => ok("ok"),
  });
  assert(!missingRes.ok && missingRes.error.code === "MISSING_IDEMPOTENCY_KEY", "missing key rejected");

  // 2. Rejection of invalid UUID
  const invalidRes = await runWithIdempotency({
    userId: testUserId,
    action: "run_scoring",
    key: "not-a-uuid",
    execute: async () => ok({ data: "ok" }),
    resolveExisting: async () => ok("ok"),
  });
  assert(!invalidRes.ok && invalidRes.error.code === "INVALID_IDEMPOTENCY_KEY", "invalid key rejected");

  // 3. New lock -> executes and completes
  let executeCount = 0;
  let completedRef: string | null | undefined = null;

  const newRes = await runWithIdempotency({
    userId: testUserId,
    action: "run_scoring",
    key: validKey,
    dal: {
      beginIdempotentAction: async () =>
        ok({
          type: "locked",
          record: {
            id: "record-1",
            userId: testUserId,
            action: "run_scoring",
            key: validKey,
            status: "in_progress",
            resultRef: null,
            createdAt: new Date(),
          },
        }),
      completeIdempotentAction: async (_id: string, ref?: string | null) => {
        completedRef = ref;
        return ok({} as unknown as IdempotencyKeySelect);
      },
    },
    execute: async () => {
      executeCount++;
      return ok({ data: { score: 95 }, resultRef: "score-123" });
    },
    resolveExisting: async () => ok({ score: 95 }),
  });

  assert(newRes.ok && newRes.value.isCached === false, "new action executes");
  assert(executeCount === 1, "execute called once");
  assert(completedRef === "score-123", "completed with resultRef");

  // 4. In-progress duplicate -> rejects with OPERATION_IN_PROGRESS
  const inProgressRes = await runWithIdempotency({
    userId: testUserId,
    action: "run_scoring",
    key: validKey,
    dal: {
      beginIdempotentAction: async () =>
        ok({
          type: "in_progress",
          record: {
            id: "record-1",
            userId: testUserId,
            action: "run_scoring",
            key: validKey,
            status: "in_progress",
            resultRef: null,
            createdAt: new Date(),
          },
        }),
    },
    execute: async () => ok({ data: { score: 95 } }),
    resolveExisting: async () => ok({ score: 95 }),
  });

  assert(
    !inProgressRes.ok && inProgressRes.error.code === "OPERATION_IN_PROGRESS",
    "in_progress returns OPERATION_IN_PROGRESS"
  );

  // 5. Completed duplicate -> resolves existing without calling execute
  executeCount = 0;
  const completedRes = await runWithIdempotency({
    userId: testUserId,
    action: "run_scoring",
    key: validKey,
    dal: {
      beginIdempotentAction: async () =>
        ok({
          type: "completed",
          record: {
            id: "record-1",
            userId: testUserId,
            action: "run_scoring",
            key: validKey,
            status: "completed",
            resultRef: "score-123",
            createdAt: new Date(),
          },
        }),
    },
    execute: async () => {
      executeCount++;
      return ok({ data: { score: 99 } });
    },
    resolveExisting: async () => ok({ score: 95 }),
  });

  assert(completedRes.ok && completedRes.value.isCached === true, "completed resolves from cache");
  assert(completedRes.ok && completedRes.value.data.score === 95, "resolves original score 95");
  assert(executeCount === 0, "execute MUST NOT be called on completed duplicate");

  // 6. Execution error -> marks failed and bubbles error
  let failedId: string | null = null;
  const failRes = await runWithIdempotency({
    userId: testUserId,
    action: "run_scoring",
    key: validKey,
    dal: {
      beginIdempotentAction: async () =>
        ok({
          type: "locked",
          record: {
            id: "record-fail",
            userId: testUserId,
            action: "run_scoring",
            key: validKey,
            status: "in_progress",
            resultRef: null,
            createdAt: new Date(),
          },
        }),
      failIdempotentAction: async (id: string) => {
        failedId = id;
        return ok({} as unknown as IdempotencyKeySelect);
      },
    },
    execute: async () => err(new AppError("RATE_LIMITED", "Provider quota exceeded")),
    resolveExisting: async () => ok({ score: 0 }),
  });

  assert(!failRes.ok && failRes.error.code === "RATE_LIMITED", "error surfaced");
  assert(failedId === "record-fail", "marked failed in DAL");

  console.log("All unit tests for runWithIdempotency passed successfully! 🚀");
}

runUnitTests()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Unit test failed:", e);
    process.exit(1);
  });
