import { computeHybridScore, blendHybridScores, DEFAULT_HYBRID_WEIGHTS } from "@/services/job.service";
import * as jobSchema from "@/services/db/schema/job";
import * as resumeSchema from "@/services/db/schema/resume";
import * as jobsDal from "@/dal/jobs.dal";
import * as jobService from "@/services/job.service";
import { SOURCE_LANGUAGE } from "@/services/adapters/ingest";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runHybridScoringTests() {
  console.log("Running Step 10: Dual-Language Hybrid Scoring unit tests...\n");

  // 1. Export verification: schema and DAL contracts
  console.log("1. Verifying dual-language schema exports...");
  assert(
    typeof jobSchema.jobLanguageEnum !== "undefined",
    "jobLanguageEnum should be exported from schema/job"
  );
  assert(
    JSON.stringify(jobSchema.jobLanguageEnum.enumValues) === JSON.stringify(["en", "fr"]),
    "jobLanguageEnum must have enum values ['en', 'fr']"
  );
  assert(
    jobSchema.job.language !== undefined,
    "job.language column should be defined on the job table"
  );
  assert(
    resumeSchema.masterResume.language !== undefined,
    "masterResume.language column should be defined on the master_resume table"
  );
  assert(
    jobSchema.job.descriptionTsv !== undefined,
    "job.descriptionTsv column should be defined on the job table"
  );
  console.log("   ✓ Schema definition verified with job_language enum and language columns.");

  // 2. Static source-to-language map verification
  console.log("2. Verifying static source-to-language map...");
  assert(SOURCE_LANGUAGE.ashby === "en", "ashby -> en");
  assert(SOURCE_LANGUAGE.greenhouse === "en", "greenhouse -> en");
  assert(SOURCE_LANGUAGE.remoteok === "en", "remoteok -> en");
  assert(SOURCE_LANGUAGE.lever === "en", "lever -> en");
  assert(SOURCE_LANGUAGE.unjobs === "en", "unjobs -> en");
  assert(SOURCE_LANGUAGE.manual === "en", "manual -> en");
  assert(SOURCE_LANGUAGE.reliefweb === "en", "reliefweb -> en");
  assert(SOURCE_LANGUAGE.congojob === "fr", "congojob -> fr");
  assert(SOURCE_LANGUAGE.emploi_cd === "fr", "emploi_cd -> fr");
  assert(SOURCE_LANGUAGE["emploi-cd"] === "fr", "emploi-cd -> fr");
  assert(SOURCE_LANGUAGE.fecrdc === "fr", "fecrdc -> fr");
  console.log("   ✓ Static source-to-language map verified (DRC boards -> fr, ATS -> en).");

  // 3. DAL function contracts
  console.log("3. Verifying DAL function contracts...");
  assert(
    typeof jobsDal.getJobResumeTsRank === "function",
    "getJobResumeTsRank should be exported from jobs.dal"
  );
  assert(
    typeof jobsDal.findJobsRankedByKeyword === "function",
    "findJobsRankedByKeyword should be exported from jobs.dal"
  );
  assert(
    typeof jobsDal.getJobHybridScores === "function",
    "getJobHybridScores should be exported from jobs.dal"
  );
  assert(
    typeof jobService.computeHybridScore === "function",
    "computeHybridScore should be exported from job.service"
  );
  assert(
    typeof jobService.scoreJobHybrid === "function",
    "scoreJobHybrid should be exported from job.service"
  );
  console.log("   ✓ DAL and service functions correctly exported.");

  // 4. Starting weights: W_SEMANTIC = 0.6, W_KEYWORD = 0.4
  console.log("4. Verifying starting weights (0.6 / 0.4)...");
  assert(DEFAULT_HYBRID_WEIGHTS.wSemantic === 0.6, "Default wSemantic must be 0.6");
  assert(DEFAULT_HYBRID_WEIGHTS.wKeyword === 0.4, "Default wKeyword must be 0.4");

  // Matching languages: 0.6 * 0.8 + 0.4 * 0.5 = 0.48 + 0.20 = 0.68 -> 68
  const scoreMatch = computeHybridScore(0.8, 0.5, "en", "en");
  assert(scoreMatch === 68, `Expected 68 for matching languages with default weights, got ${scoreMatch}`);

  const scoreMatchFr = computeHybridScore(0.9, 0.7, "fr", "fr");
  // 0.6 * 0.9 + 0.4 * 0.7 = 0.54 + 0.28 = 0.82 -> 82
  assert(scoreMatchFr === 82, `Expected 82 for matching fr/fr, got ${scoreMatchFr}`);
  console.log("   ✓ Matching language blending (0.6/0.4) verified.");

  // 5. Per-candidate language mismatch fallback (100% semantic score)
  console.log("5. Testing cross-lingual fallback (jobLanguage !== resumeLanguage)...");
  // Candidate resume is French ("fr"), Job description is English ("en")
  // Should NOT penalize with 0 keyword score; returns 100% semantic score
  const scoreMismatch1 = computeHybridScore(0.85, 0.0, "en", "fr");
  assert(scoreMismatch1 === 85, `Expected 85 (100% semantic score), got ${scoreMismatch1}`);

  // Candidate resume is English ("en"), Job description is French ("fr")
  const scoreMismatch2 = computeHybridScore(0.74, null, "fr", "en");
  assert(scoreMismatch2 === 74, `Expected 74 (100% semantic score), got ${scoreMismatch2}`);

  // When semantic score is null under language mismatch
  const scoreMismatchNull = computeHybridScore(null, 0.99, "fr", "en");
  assert(scoreMismatchNull === 0, `Expected 0 when semantic is null under mismatch, got ${scoreMismatchNull}`);
  console.log("   ✓ Cross-lingual mismatch correctly redistributes 100% weight to semantic score without penalty.");

  // 6. Graceful fallbacks and bounds
  console.log("6. Testing bounds and null fallbacks...");
  assert(computeHybridScore(null, 0.5, "en", "en") === 50, "Null semantic falls back to keyword");
  assert(computeHybridScore(0.75, null, "en", "en") === 75, "Null keyword falls back to semantic");
  assert(computeHybridScore(null, null, "en", "en") === 0, "Both null returns 0");
  assert(computeHybridScore(1.5, 1.2, "en", "en") === 100, "Clamp to 100");
  assert(computeHybridScore(-0.5, 0.0, "en", "en") === 0, "Clamp to 0");
  console.log("   ✓ Bounds and null fallbacks verified.");

  // 7. Backward-compatible alias
  console.log("7. Verifying blendHybridScores compatibility alias...");
  const aliasScore = blendHybridScores(0.8, 0.5, 0.6, 0.4);
  assert(aliasScore === 68, `Expected 68 from blendHybridScores, got ${aliasScore}`);
  console.log("   ✓ blendHybridScores alias functions identically to computeHybridScore.");

  console.log("\n=================================================");
  console.log("✨ All Step 10 Dual-Language Hybrid Scoring tests passed!");
  console.log("=================================================\n");
}

runHybridScoringTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  });
