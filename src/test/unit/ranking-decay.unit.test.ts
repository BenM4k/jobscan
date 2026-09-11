import {
  calculateExponentialDecay,
  getAgeInDays,
  applyExponentialDecay,
  decayFactor,
  computeDisplayRank,
  LAMBDA,
} from "@/services/ranking/decay";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runDecayUnitTests() {
  console.log("Running Exponential Decay unit tests...");

  // 1. Exports check
  assert(
    typeof calculateExponentialDecay === "function",
    "calculateExponentialDecay should be exported from @/services/ranking/decay",
  );
  assert(
    typeof applyExponentialDecay === "function",
    "applyExponentialDecay should be exported from @/services/ranking/decay",
  );
  assert(
    typeof getAgeInDays === "function",
    "getAgeInDays should be exported from @/services/ranking/decay",
  );
  assert(
    typeof decayFactor === "function",
    "decayFactor should be exported from @/services/ranking/decay",
  );
  assert(
    typeof computeDisplayRank === "function",
    "computeDisplayRank should be exported from @/services/ranking/decay",
  );
  assert(LAMBDA === 0.0495, `LAMBDA must be 0.0495, got ${LAMBDA}`);

  // 2. Pure function: Math.exp(-lambda * ageInDays)
  // At age 0: exp(0) = 1
  const decay0 = calculateExponentialDecay(0);
  assert(Math.abs(decay0 - 1.0) < 1e-6, `Expected 1.0 at age 0, got ${decay0}`);

  // At negative age (invalid/future date): returns 1.0
  const decayNegative = calculateExponentialDecay(-5);
  assert(
    decayNegative === 1.0,
    `Expected 1.0 for negative age, got ${decayNegative}`,
  );

  // At age 14 days with default lambda (0.05): exp(-0.05 * 14) = exp(-0.7) ≈ 0.496585
  const decay14 = calculateExponentialDecay(14, 0.05);
  const expected14 = Math.exp(-0.7);
  assert(
    Math.abs(decay14 - expected14) < 1e-6,
    `Expected ${expected14}, got ${decay14}`,
  );

  // Custom lambda: lambda = 0.1, age = 10 -> exp(-1.0) ≈ 0.367879
  const decayCustom = calculateExponentialDecay(10, 0.1);
  assert(
    Math.abs(decayCustom - Math.exp(-1.0)) < 1e-6,
    `Expected ${Math.exp(-1.0)}, got ${decayCustom}`,
  );

  // 3. Date diff: getAgeInDays
  const now = new Date("2026-09-05T12:00:00Z");
  const threeDaysAgo = new Date("2026-09-02T12:00:00Z");
  const age = getAgeInDays(threeDaysAgo, now);
  assert(Math.abs(age - 3.0) < 1e-6, `Expected 3.0 days, got ${age}`);

  // Null / invalid date returns 0
  assert(getAgeInDays(null, now) === 0, "Null date should return 0");
  assert(getAgeInDays(undefined, now) === 0, "Undefined date should return 0");
  assert(
    getAgeInDays("invalid-date", now) === 0,
    "Invalid date should return 0",
  );

  // Future date returns 0
  const tomorrow = new Date("2026-09-06T12:00:00Z");
  assert(getAgeInDays(tomorrow, now) === 0, "Future date should return 0");

  // 4. decayFactor(postedAt, now?) tests
  // Null / undefined / invalid postedAt returns 1 (no penalty)
  assert(decayFactor(null, now) === 1.0, "decayFactor(null) must return 1.0");
  assert(
    decayFactor(undefined, now) === 1.0,
    "decayFactor(undefined) must return 1.0",
  );
  assert(
    decayFactor("not-a-date", now) === 1.0,
    "decayFactor(invalid date) must return 1.0",
  );

  // Future date returns 1.0
  assert(
    decayFactor(tomorrow, now) === 1.0,
    "decayFactor(future date) must return 1.0",
  );

  // Posted now (age = 0) returns 1.0
  assert(
    decayFactor(now, now) === 1.0,
    "decayFactor(same day) must return 1.0",
  );

  // Exactly 14 days ago: ageInDays = 14, decay = exp(-0.0495 * 14) = exp(-0.693) ≈ 0.50007 (≈ 50% half-life)
  const fourteenDaysAgo = new Date("2026-08-22T12:00:00Z");
  const factor14 = decayFactor(fourteenDaysAgo, now);
  const expectedFactor14 = Math.exp(-0.0495 * 14);
  assert(
    Math.abs(factor14 - expectedFactor14) < 1e-6,
    `decayFactor for 14 days should be ${expectedFactor14}, got ${factor14}`,
  );
  assert(
    Math.abs(factor14 - 0.5) < 0.005,
    "14 days decay factor should be approximately 0.50",
  );

  // 5. Read-time displayRank computation: computeDisplayRank
  // Fresh job (score = 80, age = 0) -> 80
  assert(
    computeDisplayRank(80, now, now) === 80,
    "Fresh job display rank should equal undecayed score",
  );

  // Null postedAt job (score = 85, postedAt = null) -> 85 (no penalty)
  assert(
    computeDisplayRank(85, null, now) === 85,
    "Null postedAt should return full undecayed score",
  );

  // 14-day old job (score = 80) -> round(80 * exp(-0.0495 * 14)) = round(80 * ~0.50007) = 40
  assert(
    computeDisplayRank(80, fourteenDaysAgo, now) === 40,
    "14-day old job should decay by ~50%",
  );

  // 6. Score scaling: applyExponentialDecay
  // New job (age = 0): no decay
  const freshScore = applyExponentialDecay(85, 0);
  assert(freshScore === 85, `Expected 85 for fresh job, got ${freshScore}`);

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
