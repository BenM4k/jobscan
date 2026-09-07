import {
  calculateExponentialDecay,
  getAgeInDays,
  applyExponentialDecay,
  DEFAULT_DECAY_LAMBDA,
} from "@/lib/decay";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runLibDecayUnitTests() {
  console.log("Running src/lib/decay.ts unit tests...\n");

  // 1. Check exports
  assert(typeof calculateExponentialDecay === "function", "calculateExponentialDecay must be a function");
  assert(typeof getAgeInDays === "function", "getAgeInDays must be a function");
  assert(typeof applyExponentialDecay === "function", "applyExponentialDecay must be a function");
  assert(DEFAULT_DECAY_LAMBDA === 0.05, "DEFAULT_DECAY_LAMBDA must be 0.05");

  // 2. Mathematical precision of pure function Math.exp(-lambda * ageInDays)
  // Day 0: exp(0) = 1
  assert(Math.abs(calculateExponentialDecay(0) - 1.0) < 1e-6, "Decay at age 0 must be 1.0");
  assert(calculateExponentialDecay(-10) === 1.0, "Decay for negative age must return 1.0");

  // Day 7: exp(-0.05 * 7) = exp(-0.35) ≈ 0.704688
  const decay7 = calculateExponentialDecay(7);
  assert(Math.abs(decay7 - Math.exp(-0.35)) < 1e-6, "Decay at 7 days should match exp(-0.35)");

  // Day 14: exp(-0.05 * 14) = exp(-0.7) ≈ 0.496585
  const decay14 = calculateExponentialDecay(14);
  assert(Math.abs(decay14 - Math.exp(-0.7)) < 1e-6, "Decay at 14 days should match exp(-0.7)");

  // Day 30: exp(-0.05 * 30) = exp(-1.5) ≈ 0.223130
  const decay30 = calculateExponentialDecay(30);
  assert(Math.abs(decay30 - Math.exp(-1.5)) < 1e-6, "Decay at 30 days should match exp(-1.5)");

  // 3. Score application & clamping
  // Fresh job (85 score) -> 85
  assert(applyExponentialDecay(85, 0) === 85, "Fresh job score must not decay");

  // 14 days old (80 score) -> round(80 * exp(-0.7)) = round(39.7268) = 40
  assert(applyExponentialDecay(80, 14) === 40, "14-day old job score should be 40");

  // Boundary clamping
  assert(applyExponentialDecay(120, 0) === 100, "Score above 100 should clamp to 100");
  assert(applyExponentialDecay(-50, 0) === 0, "Score below 0 should clamp to 0");

  // 4. Date calculation
  const reference = new Date("2026-09-07T12:00:00Z");
  const fiveDaysAgo = new Date("2026-09-02T12:00:00Z");
  assert(Math.abs(getAgeInDays(fiveDaysAgo, reference) - 5.0) < 1e-6, "Should compute 5.0 days");
  assert(getAgeInDays(null, reference) === 0, "Null date should return 0");
  assert(getAgeInDays(undefined, reference) === 0, "Undefined date should return 0");

  console.log("✓ All src/lib/decay.ts unit tests passed successfully! 🎉");
}

runLibDecayUnitTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
