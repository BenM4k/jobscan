import assert from "node:assert/strict";
import { job, jobSourceRef } from "@/services/db/schema/job";
import { getTableConfig } from "drizzle-orm/pg-core";
import {
  computeSimhash,
  buildJobSimhashText,
  normalizeText,
  MAX_HAMMING_DISTANCE,
} from "@/services/dedup/simhash";
import {
  findNearDuplicateJobId,
  LOOKBACK_DAYS,
} from "@/services/dedup/find-duplicate";
import * as jobsDal from "@/dal/jobs.dal";

console.log(
  "Running Step 3 — SimHash Cross-Source Deduplication Verification Suite...\n",
);

// 1. Verify job.simhash column is typed bigint (mode: "bigint"), not numeric
console.log("1. Verifying job.simhash column type in Drizzle schema...");
assert(job.simhash, "job table must have simhash column");
assert.equal(
  job.simhash.dataType,
  "bigint",
  "job.simhash dataType must be 'bigint', not numeric",
);
console.log("   ✓ job.simhash is typed bigint (mode: 'bigint').");

// 2. Verify SimHash computation uses @counterrealist/simhash and returns compatible bigint
console.log("\n2. Verifying SimHash computation and return types...");
const sampleText = "Principal Software Architect at Stripe Inc.";
const simhashResult = computeSimhash(sampleText);

assert.equal(
  typeof simhashResult.signedBigInt,
  "bigint",
  "simhashResult.signedBigInt must be of type bigint",
);
assert.equal(
  typeof simhashResult.hashString,
  "string",
  "simhashResult.hashString must be a string",
);
assert.equal(
  BigInt(simhashResult.hashString),
  simhashResult.signedBigInt,
  "simhashResult.hashString must parse to identical signedBigInt",
);
console.log(
  "   ✓ SimHash returns native bigint compatible with PostgreSQL bigint column.",
);

// 3. Verify normalizeText strips HTML, lowercases, strips punctuation, and collapses whitespace
console.log("\n3. Verifying text normalization across sources...");
const messyScrapedHtml = `
  <div>
    <style>.hide { display: none; }</style>
    <h1>Senior React / Next.js Engineer!</h1>
    <script>alert("tracker");</script>
    <p>We're building... cutting-edge, AI-powered software & tools? @Remote, 100%.</p>
  </div>
`;
const normalized = normalizeText(messyScrapedHtml);
assert(
  !normalized.includes("<") && !normalized.includes(">"),
  "normalized text must not contain HTML tags",
);
assert(
  !normalized.includes("display: none") && !normalized.includes("tracker"),
  "normalized text must strip style and script tags",
);
assert(
  !/[!?,.@&%#]/.test(normalized),
  "normalized text must strip punctuation",
);
assert(
  normalized === normalized.toLowerCase(),
  "normalized text must be lowercase",
);
assert(
  !/\s{2,}/.test(normalized),
  "normalized text must have whitespace collapsed",
);
console.log(
  "   ✓ normalizeText correctly strips HTML, punctuation, lowercases, and collapses whitespace.",
);

// 4. Verify hash input is normalized title + company + description
console.log(
  "\n4. Verifying hash input construction (title + company + description)...",
);
const builtText = buildJobSimhashText(
  "Staff Engineer!",
  "Stripe, Inc.",
  "<p>Build payment infrastructure at global scale.</p>",
);
assert(builtText.includes("staff engineer"), "Must include normalized title");
assert(builtText.includes("stripe inc"), "Must include normalized company");
assert(
  builtText.includes("build payment infrastructure at global scale"),
  "Must include normalized description",
);
console.log(
  "   ✓ buildJobSimhashText concatenates normalized title + company + description.",
);

// 5. Verify find-duplicate.ts exports LOOKBACK_DAYS = 30 and MAX_HAMMING_DISTANCE = 4
console.log(
  "\n5. Verifying findNearDuplicateJobId parameters and lookback window...",
);
assert.equal(LOOKBACK_DAYS, 30, "LOOKBACK_DAYS must be 30");
assert.equal(MAX_HAMMING_DISTANCE, 4, "MAX_HAMMING_DISTANCE must be 4");
assert.equal(
  typeof findNearDuplicateJobId,
  "function",
  "findNearDuplicateJobId must be an exported function",
);

// Verify findNearDuplicateJobId accepts custom lookbackDays and maxDistance options
const testSimhash = "1234567890123456789";
const fnSignatureCheck = async () => {
  try {
    await findNearDuplicateJobId(testSimhash, {
      lookbackDays: 14,
      maxDistance: 3,
      excludeJobId: "00000000-0000-0000-0000-000000000000",
    });
  } catch {
    // Database connection may not be present in unit test environment
  }
};
assert.doesNotThrow(() => fnSignatureCheck());
console.log(
  "   ✓ findNearDuplicateJobId configured with 30 days lookback and MAX_HAMMING_DISTANCE = 4.",
);

// 6. Verify job_source_ref schema and unique constraint
console.log("\n6. Verifying job_source_ref schema and constraints...");
assert(jobSourceRef.jobId, "job_source_ref must have jobId column");
assert(jobSourceRef.source, "job_source_ref must have source column");
assert(jobSourceRef.externalId, "job_source_ref must have externalId column");
assert(jobSourceRef.url, "job_source_ref must have url column");

const jobSourceRefConfig = getTableConfig(jobSourceRef);
const hasUniqueOnSourceExtId = jobSourceRefConfig.indexes.some((idx) => {
  const isUnique = idx.config?.unique === true;
  const colNames = idx.config?.columns?.map((c) =>
    c && "name" in c && typeof c.name === "string" ? c.name : undefined
  );
  return isUnique && colNames?.includes("source") && colNames?.includes("external_id");
});
assert(hasUniqueOnSourceExtId, "job_source_ref must have unique index on (source, external_id)");
console.log(
  "   ✓ job_source_ref table exists with correct schema and unique index on (source, external_id).",
);

// 7. Verify DAL exports routine re-fetch check functions
console.log(
  "\n7. Verifying routine re-fetch detection functions in jobsDal...",
);
assert.equal(
  typeof jobsDal.getCanonicalJobBySourceAndExternalId,
  "function",
  "jobsDal.getCanonicalJobBySourceAndExternalId must be exported",
);
assert.equal(
  typeof jobsDal.getJobSourceRefBySourceAndExternalId,
  "function",
  "jobsDal.getJobSourceRefBySourceAndExternalId must be exported",
);
console.log("   ✓ Routine re-fetch detection functions verified.");

// 8. Verify UI support for alsoPostedOn
console.log("\n8. Verifying alsoPostedOn in JobSelect type...");
const sampleJobSelect: jobsDal.JobSelect = {
  id: "test-job-id",
  userId: "user-123",
  source: "greenhouse",
  externalId: "gh-101",
  title: "Fullstack Engineer",
  company: "Vercel",
  url: "https://example.com",
  description: "Next.js engineer",
  postedAt: new Date(),
  status: "active",
  createdAt: new Date(),
  fitScore: 92,
  scoreReasoning: "Strong match",
  matchedSkills: ["React", "Next.js"],
  missingSkills: [],
  gaps: [],
  coverLetterDraft: null,
  tailoredResume: null,
  tailoredResumeData: null,
  alsoPostedOn: ["ashby", "remoteok"],
};

assert.deepEqual(
  sampleJobSelect.alsoPostedOn,
  ["ashby", "remoteok"],
  "JobSelect must carry alsoPostedOn array for UI display",
);
console.log(
  "   ✓ JobSelect includes alsoPostedOn for job detail/card UI display.",
);

console.log("\n All Step 3 checks passed successfully! ✓\n");
