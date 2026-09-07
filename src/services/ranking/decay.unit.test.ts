import {
  calculateExponentialDecay,
  getAgeInDays,
  applyExponentialDecay,
  DEFAULT_DECAY_LAMBDA,
} from "@/services/ranking/decay";
import * as aliasDecay from "@/service/ranking/decay";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runDecayUnitTests() {
  console.log("Running Exponential Decay unit tests...");

  // 1. Alias parity test: src/service/ranking/decay.ts matches src/services/ranking/decay.ts
  assert(
    typeof aliasDecay.calculateExponentialDecay === "function",
    "calculateExponentialDecay should be exported from @/service/ranking/decay"
  );
  assert(
    typeof aliasDecay.applyExponentialDecay === "function",
    "applyExponentialDecay should be exported from @/service/ranking/decay"
  );
  assert(
    typeof aliasDecay.getAgeInDays === "function",
    "getAgeInDays should be exported from @/service/ranking/decay"
  );

  // 2. Pure function: Math.exp(-lambda * ageInDays)
  // At age 0: exp(0) = 1
  const decay0 = calculateExponentialDecay(0);
  assert(Math.abs(decay0 - 1.0) < 1e-6, `Expected 1.0 at age 0, got ${decay0}`);

  // At negative age (invalid/future date): returns 1.0
  const decayNegative = calculateExponentialDecay(-5);
  assert(decayNegative === 1.0, `Expected 1.0 for negative age, got ${decayNegative}`);

  // At age 14 days with default lambda (0.05): exp(-0.05 * 14) = exp(-0.7) ≈ 0.496585
  const decay14 = calculateExponentialDecay(14, 0.05);
  const expected14 = Math.exp(-0.7);
  assert(
    Math.abs(decay14 - expected14) < 1e-6,
    `Expected ${expected14}, got ${decay14}`
  );

  // Custom lambda: lambda = 0.1, age = 10 -> exp(-1.0) ≈ 0.367879
  const decayCustom = calculateExponentialDecay(10, 0.1);
  assert(
    Math.abs(decayCustom - Math.exp(-1.0)) < 1e-6,
    `Expected ${Math.exp(-1.0)}, got ${decayCustom}`
  );

  // 3. Date diff: getAgeInDays
  const now = new Date("2026-09-05T12:00:00Z");
  const threeDaysAgo = new Date("2026-09-02T12:00:00Z");
  const age = getAgeInDays(threeDaysAgo, now);
  assert(Math.abs(age - 3.0) < 1e-6, `Expected 3.0 days, got ${age}`);

  // Null / invalid date returns 0
  assert(getAgeInDays(null, now) === 0, "Null date should return 0");
  assert(getAgeInDays(undefined, now) === 0, "Undefined date should return 0");
  assert(getAgeInDays("invalid-date", now) === 0, "Invalid date should return 0");

  // Future date returns 0
  const tomorrow = new Date("2026-09-06T12:00:00Z");
  assert(getAgeInDays(tomorrow, now) === 0, "Future date should return 0");

  // 4. Score scaling: applyExponentialDecay
  // New job (age = 0): no decay
  const freshScore = applyExponentialDecay(85, 0);
  assert(freshScore === 85, `Expected 85 for fresh job, got ${freshScore}`);

  // 14-day old job with initial score 80: 80 * exp(-0.7) ≈ 80 * 0.496585 = 39.72 -> 40
  const twoWeekScore = applyExponentialDecay(80, 14, DEFAULT_DECAY_LAMBDA);
  assert(twoWeekScore === 40, `Expected 40 for 14-day job, got ${twoWeekScore}`);

  // 30-day old job with initial score 100: 100 * exp(-1.5) ≈ 100 * 0.22313 = 22.31 -> 22
  const monthScore = applyExponentialDecay(100, 30, DEFAULT_DECAY_LAMBDA);
  assert(monthScore === 22, `Expected 22 for 30-day job, got ${monthScore}`);

  // Clamping bounds
  assert(applyExponentialDecay(150, 0) === 100, "Should clamp max to 100");
  assert(applyExponentialDecay(-20, 0) === 0, "Should clamp min to 0");

  console.log("✓ All Exponential Decay unit tests passed successfully!");
}

runDecayUnitTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  });
