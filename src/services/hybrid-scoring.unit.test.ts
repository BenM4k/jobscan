import { blendHybridScores } from "./job.service";
import * as jobSchema from "./db/schema/job";
import * as jobsDal from "@/dal/jobs.dal";
import * as jobService from "./job.service";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runHybridScoringTests() {
  console.log("Running Hybrid Scoring unit tests...");

  // 1. Export verification: schema and DAL contracts
  assert(
    typeof jobSchema.tsvector === "function",
    "tsvector customType should be exported from schema/job"
  );
  assert(
    jobSchema.job.descriptionTsv !== undefined,
    "job.descriptionTsv column should be defined on the job table"
  );
  assert(
    typeof jobsDal.getJobResumeTsRank === "function",
    "getJobResumeTsRank should be exported from jobs.dal"
  );
  assert(
    typeof jobsDal.getJobHybridScores === "function",
    "getJobHybridScores should be exported from jobs.dal"
  );
  assert(
    typeof jobsDal.saveHybridScore === "function",
    "saveHybridScore should be exported from jobs.dal"
  );
  assert(
    typeof jobsDal.recalculateScoreWithWeights === "function",
    "recalculateScoreWithWeights should be exported from jobs.dal"
  );
  assert(
    typeof jobService.scoreJobHybrid === "function",
    "scoreJobHybrid should be exported from job.service"
  );
  assert(
    typeof jobService.blendHybridScores === "function",
    "blendHybridScores should be exported from job.service"
  );
  assert(
    typeof jobService.tuneScoreWeights === "function",
    "tuneScoreWeights should be exported from job.service"
  );

  // 2. Hybrid formula tests: finalScore = w1*cosine + w2*ts_rank
  // Default weights: w1 = 0.7, w2 = 0.3
  // 0.7 * 0.8 + 0.3 * 0.5 = 0.56 + 0.15 = 0.71 -> 71
  const score1 = blendHybridScores(0.8, 0.5, 0.7, 0.3);
  assert(score1 === 71, `Expected 71, got ${score1}`);

  // Equal weights: w1 = 0.5, w2 = 0.5
  // 0.5 * 0.8 + 0.5 * 0.4 = 0.4 + 0.2 = 0.6 -> 60
  const score2 = blendHybridScores(0.8, 0.4, 0.5, 0.5);
  assert(score2 === 60, `Expected 60, got ${score2}`);

  // Integer weights: w1 = 70, w2 = 30
  // (70*0.8 + 30*0.5) / 100 = 0.71 -> 71
  const score3 = blendHybridScores(0.8, 0.5, 70, 30);
  assert(score3 === 71, `Expected 71 with integer weights, got ${score3}`);

  // Pure cosine focus: w1 = 1.0, w2 = 0.0
  const scoreCosineOnly = blendHybridScores(0.85, 0.1, 1.0, 0.0);
  assert(scoreCosineOnly === 85, `Expected 85, got ${scoreCosineOnly}`);

  // Pure lexical focus: w1 = 0.0, w2 = 1.0
  const scoreBm25Only = blendHybridScores(0.1, 0.75, 0.0, 1.0);
  assert(scoreBm25Only === 75, `Expected 75, got ${scoreBm25Only}`);

  // 3. Graceful fallback on missing/null metrics
  // When cosine is null (no embedding yet)
  const scoreNullCosine = blendHybridScores(null, 0.65, 0.7, 0.3);
  assert(scoreNullCosine === 65, `Expected 65 when cosine is null, got ${scoreNullCosine}`);

  // When bm25 is null (no text match)
  const scoreNullBm25 = blendHybridScores(0.92, null, 0.7, 0.3);
  assert(scoreNullBm25 === 92, `Expected 92 when bm25 is null, got ${scoreNullBm25}`);

  // When both are null
  const scoreBothNull = blendHybridScores(null, null, 0.7, 0.3);
  assert(scoreBothNull === 0, `Expected 0 when both are null, got ${scoreBothNull}`);

  // 4. Clamping bounds [0, 100]
  const scoreMaxClamp = blendHybridScores(1.5, 1.2, 0.7, 0.3);
  assert(scoreMaxClamp === 100, `Expected clamp to 100, got ${scoreMaxClamp}`);

  const scoreMinClamp = blendHybridScores(-0.5, 0.0, 0.7, 0.3);
  assert(scoreMinClamp === 0, `Expected clamp to 0, got ${scoreMinClamp}`);

  // 5. Simulating weight retuning without re-running AI calls
  // Suppose stored values in score table are:
  const storedCosine = 0.82;
  const storedBm25 = 0.45;

  // With initial weights: 80% dense, 20% sparse
  const initialFit = blendHybridScores(storedCosine, storedBm25, 0.8, 0.2);
  // (0.8 * 0.82 + 0.2 * 0.45) = 0.656 + 0.09 = 0.746 -> 75
  assert(initialFit === 75, `Expected 75 for initial weights, got ${initialFit}`);

  // Later user adjusts weights: 40% dense, 60% sparse (without any AI provider call)
  const retunedFit = blendHybridScores(storedCosine, storedBm25, 0.4, 0.6);
  // (0.4 * 0.82 + 0.6 * 0.45) = 0.328 + 0.27 = 0.598 -> 60
  assert(retunedFit === 60, `Expected 60 for retuned weights, got ${retunedFit}`);

  console.log("✓ All Hybrid Scoring unit tests passed successfully!");
}

runHybridScoringTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  });
