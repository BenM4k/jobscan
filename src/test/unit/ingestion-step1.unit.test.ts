import assert from "node:assert/strict";
import { rawJobPayload } from "@/services/db/schema/job";
import {
  FUNCTIONAL_ADAPTERS,
  ingestFromSource,
} from "@/services/adapters/ingest";
import * as congojob from "@/services/adapters/congojob.adapter";
import * as emploicd from "@/services/adapters/emploicd.adapter";
import * as fecrdc from "@/services/adapters/fecrdc.adapter";
import * as unjobs from "@/services/adapters/unjobs.adapter";
import * as ashby from "@/services/adapters/ashby.adapter";
import * as greenhouse from "@/services/adapters/greenhouse.adapter";
import * as remoteok from "@/services/adapters/remoteok.adapter";
import * as lever from "@/services/adapters/lever.adapter";

console.log("Running Ingestion Step 1 Verification Test Suite...\n");

// 1. Verify raw_job_payload table schema
console.log("1. Checking raw_job_payload table schema columns...");
assert(rawJobPayload.id, "raw_job_payload must have id column");
assert(rawJobPayload.source, "raw_job_payload must have source column");
assert(rawJobPayload.externalId, "raw_job_payload must have external_id column");
assert(rawJobPayload.payload, "raw_job_payload must have payload column");
assert(rawJobPayload.fetchedAt, "raw_job_payload must have fetched_at column");
assert(
  rawJobPayload.normalizedJobId,
  "raw_job_payload must have normalized_job_id column"
);
assert(rawJobPayload.createdAt, "raw_job_payload must have created_at column");
assert(rawJobPayload.updatedAt, "raw_job_payload must have updated_at column");
console.log(" raw_job_payload table schema verified.");

// 2. Verify all 8 adapters export fetchRaw and normalize
console.log("\n2. Checking 8 adapters for fetchRaw and normalize exports...");
const adapters = [
  { name: "ashby", mod: ashby },
  { name: "greenhouse", mod: greenhouse },
  { name: "remoteok", mod: remoteok },
  { name: "lever", mod: lever },
  { name: "congojob", mod: congojob },
  { name: "emploi_cd", mod: emploicd },
  { name: "fecrdc", mod: fecrdc },
  { name: "unjobs", mod: unjobs },
];

for (const { name, mod } of adapters) {
  assert(
    typeof (mod as { fetchRaw?: unknown }).fetchRaw === "function",
    `${name} must export fetchRaw()`
  );
  assert(
    typeof (mod as { normalize?: unknown }).normalize === "function",
    `${name} must export normalize()`
  );
  console.log(` ${name} exports fetchRaw and normalize`);
}

// 3. Verify CongoJob HTML stripping and normalization
console.log("\n3. Testing CongoJob HTML stripping to plain text...");
const sampleCongoJobCardHtml = `
<div class="pxp-jobs-card-3">
  <a class="pxp-jobs-card-3-title" href="https://congojob.cd/job/lead-software-engineer-kinshasa">
    Lead Software Engineer – Vodacom Congo
  </a>
  <a class="pxp-jobs-card-3-location">Kinshasa, RDC</a>
  <span class="pxp-jobs-card-3-category-label">Informatique & Télécoms</span>
  <span class="pxp-jobs-card-3-date">08/09/2026</span>
  <div class="pxp-jobs-card-3-company-logo" style="background-image: url('/uploads/vodacom.png');"></div>
</div>
`;

const normalizedCongo = congojob.normalize({
  html: sampleCongoJobCardHtml,
  url: "https://congojob.cd/job/lead-software-engineer-kinshasa",
});

assert.equal(normalizedCongo.source, "congojob");
assert.equal(
  normalizedCongo.title,
  "Lead Software Engineer – Vodacom Congo"
);
assert.equal(normalizedCongo.company, "VODACOM");
assert.equal(normalizedCongo.city, "Kinshasa, RDC");
assert.equal(normalizedCongo.countryCode, "CD");
assert(
  !normalizedCongo.description.includes("<div"),
  "Description must strip HTML tags"
);
assert(
  !normalizedCongo.description.includes("pxp-jobs-card-3"),
  "Description must strip HTML classes"
);
assert(
  normalizedCongo.description.includes("Informatique & Télécoms"),
  "Description must retain stripped plain text"
);
console.log(" CongoJob HTML stripping and pure normalization verified.");

// 4. Verify shared orchestrator registration
console.log("\n4. Verifying shared orchestrator and functional adapter registration...");
assert(
  typeof ingestFromSource === "function",
  "ingestFromSource orchestrator must be exported"
);
for (const key of [
  "ashby",
  "greenhouse",
  "remoteok",
  "lever",
  "congojob",
  "emploi_cd",
  "fecrdc",
  "unjobs",
]) {
  assert(
    FUNCTIONAL_ADAPTERS[key],
    `FUNCTIONAL_ADAPTERS must contain entry for ${key}`
  );
}
console.log(" Shared orchestrator and all 8 adapter mappings verified.");

console.log("\n All Step 1 checks passed successfully!");
