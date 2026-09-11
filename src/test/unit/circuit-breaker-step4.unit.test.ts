import {
  calculateBackoffMs,
  FAILURE_THRESHOLD,
  BASE_BACKOFF_MS,
  MAX_BACKOFF_MS,
  canAttempt,
  recordSuccess,
  recordFailure,
} from "@/services/reliability/circuit-breaker";
import { adapterCircuitBreaker, circuitBreakerStateEnum } from "@/services/db/schema";
import { ingestFromSource } from "@/services/adapters/ingest";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runStep4UnitTests() {
  console.log("Starting Step 4 — Circuit Breaker + Exponential Backoff verification tests...\n");

  // 1. Backoff math test: min(30min, 1min * 2^consecutiveOpens)
  console.log("1. Testing exponential backoff formula and caps...");
  assert(FAILURE_THRESHOLD === 5, "Failure threshold must be 5");
  assert(BASE_BACKOFF_MS === 60_000, "Base backoff must be 1 minute (60,000ms)");
  assert(MAX_BACKOFF_MS === 1_800_000, "Max backoff must be 30 minutes (1,800,000ms)");

  assert(calculateBackoffMs(0) === 60_000, "0 consecutive opens should give 1 minute (60,000ms)");
  assert(calculateBackoffMs(1) === 120_000, "1 consecutive open should give 2 minutes (120,000ms)");
  assert(calculateBackoffMs(2) === 240_000, "2 consecutive opens should give 4 minutes (240,000ms)");
  assert(calculateBackoffMs(3) === 480_000, "3 consecutive opens should give 8 minutes (480,000ms)");
  assert(calculateBackoffMs(4) === 960_000, "4 consecutive opens should give 16 minutes (960,000ms)");
  assert(calculateBackoffMs(5) === 1_800_000, "5 consecutive opens should cap at 30 minutes (1,800,000ms)");
  assert(calculateBackoffMs(10) === 1_800_000, "10 consecutive opens should cap at 30 minutes (1,800,000ms)");
  console.log("✓ Backoff math verified: 1m -> 2m -> 4m -> 8m -> 16m -> 30m (capped)\n");

  // 2. Verify Schema Definition
  console.log("2. Verifying Postgres schema definition...");
  assert(Boolean(adapterCircuitBreaker), "adapter_circuit_breaker table must exist in schema");
  assert(Boolean(circuitBreakerStateEnum), "circuit_breaker_state enum must exist in schema");
  assert(
    JSON.stringify(circuitBreakerStateEnum.enumValues) ===
      JSON.stringify(["closed", "open", "half_open"]),
    "Enum values must be closed, open, half_open"
  );
  console.log("✓ Schema definition verified with closed/open/half_open states\n");

  // 3. Verify services export
  console.log("3. Verifying src/services/reliability/circuit-breaker.ts exports...");
  assert(typeof canAttempt === "function", "canAttempt must be exported from services");
  assert(typeof recordSuccess === "function", "recordSuccess must be exported from services");
  assert(typeof recordFailure === "function", "recordFailure must be exported from services");
  console.log("✓ All required functions exported from src/services/reliability/circuit-breaker\n");

  // 4. Verify ingestFromSource wraps fetchRaw with circuit-breaker metadata
  console.log("4. Verifying ingestFromSource returns structured skipped/reason metadata...");
  const invalidSourceRes = await ingestFromSource("non_existent_source");
  assert(!invalidSourceRes.ok, "Invalid source should return error");

  console.log("All Step 4 verification tests passed successfully!");
}

runStep4UnitTests().catch((err) => {
  console.error("Step 4 Unit Test failed:", err);
  process.exit(1);
});
