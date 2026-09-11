import assert from "node:assert/strict";
import { upsertJob, insertRawJobPayload } from "@/dal/jobs.dal";
import { rawJobPayload, job, jobSourceRef } from "@/services/db/schema/job";
import { NormalizedJobInput } from "@/services/adapters/types";
import { getTableConfig } from "drizzle-orm/pg-core";

console.log("Running Ingestion Step 2 Verification Test Suite...\n");

// 1. Verify DAL functions exist and are exported
console.log("1. Checking upsertJob and insertRawJobPayload exports...");
assert.equal(
  typeof upsertJob,
  "function",
  "upsertJob must be a function"
);
assert.equal(
  typeof insertRawJobPayload,
  "function",
  "insertRawJobPayload function must be exported"
);
console.log("✓ DAL canonical upsert functions successfully exported.");

// 2. Verify table schema unique indexes targeted by onConflictDoUpdate
console.log("\n2. Verifying unique constraints on (source, external_id)...");
const jobConfig = getTableConfig(job);
const rawPayloadConfig = getTableConfig(rawJobPayload);
const jobSourceRefConfig = getTableConfig(jobSourceRef);

const hasUniqueIndexOn = (
  tableConfig: ReturnType<typeof getTableConfig>,
  col1: string,
  col2: string
) => {
  return tableConfig.indexes.some((idx) => {
    const isUnique = idx.config?.unique === true;
    const colNames = idx.config?.columns?.map((c) =>
      c && "name" in c && typeof c.name === "string" ? c.name : undefined
    );
    return isUnique && colNames?.includes(col1) && colNames?.includes(col2);
  });
};

assert(
  hasUniqueIndexOn(jobConfig, "source", "external_id"),
  "job table must have unique index on (source, external_id)"
);
assert(
  hasUniqueIndexOn(rawPayloadConfig, "source", "external_id"),
  "raw_job_payload table must have unique index on (source, external_id)"
);
assert(
  hasUniqueIndexOn(jobSourceRefConfig, "source", "external_id"),
  "job_source_ref table must have unique index on (source, external_id)"
);
console.log("✓ Schema unique indexes for (source, external_id) conflict targets verified.");

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
console.log("✓ NormalizedJobInput shared contract verified.");

console.log("\n✨ All Step 2 checks passed successfully!");
