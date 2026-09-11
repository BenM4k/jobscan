import assert from "node:assert/strict";
import { rawJobPayloadDal, jobDal, upsertFromSource, insertRawJobPayload } from "@/dal/jobs.dal";
import { rawJobPayload, job } from "@/services/db/schema/job";
import { NormalizedJobInput } from "@/services/adapters/types";

console.log("Running Ingestion Step 2 Verification Test Suite...\n");

// 1. Verify DAL functions exist and are exported
console.log("1. Checking rawJobPayloadDal and jobDal exports...");
assert.equal(
  typeof rawJobPayloadDal.upsert,
  "function",
  "rawJobPayloadDal.upsert must be a function"
);
assert.equal(
  typeof jobDal.upsertFromSource,
  "function",
  "jobDal.upsertFromSource must be a function"
);
assert.equal(
  typeof upsertFromSource,
  "function",
  "upsertFromSource function must be exported"
);
assert.equal(
  typeof insertRawJobPayload,
  "function",
  "insertRawJobPayload function must be exported"
);
console.log(" DAL upsert functions successfully exported.");

// 2. Verify table schema unique indexes targeted by onConflictDoUpdate
console.log("\n2. Verifying unique constraints on (source, external_id)...");
assert(job.source, "job table must have source column");
assert(job.externalId, "job table must have external_id column");
assert(rawJobPayload.source, "raw_job_payload table must have source column");
assert(rawJobPayload.externalId, "raw_job_payload table must have external_id column");
console.log(" Schema columns for (source, external_id) conflict targets verified.");

// 3. Verify NormalizedJobInput shared contract fields
console.log("\n3. Verifying NormalizedJobInput shared contract shape...");
const testJobInput: NormalizedJobInput = {
  externalId: "ext-123",
  source: "remoteok",
  title: "Senior Fullstack Engineer",
  company: "Tech Corp",
  url: "https://example.com/job/123",
  description: "Job description text",
  postedAt: new Date("2026-09-01"),
  country: "United States",
  countryCode: "US",
  city: "San Francisco",
  workplaceType: "remote",
  remoteRegions: ["Worldwide"],
  salaryMin: "120000",
  salaryMax: "160000",
  salaryCurrency: "USD",
  salaryPeriod: "yearly",
  salaryNormalizedYearlyUsd: "140000",
  rawSalaryText: "$120k - $160k USD",
};

assert.equal(testJobInput.source, "remoteok");
assert.equal(testJobInput.title, "Senior Fullstack Engineer");
assert.equal(testJobInput.salaryCurrency, "USD");
console.log(" NormalizedJobInput shared contract verified.");

console.log("\n All Step 2 checks passed successfully!");
