import { masterResume, tailoredResume, masterResumeSourceEnum } from "@/services/db/schema";
import {
  createMasterResumeSchema,
  updateMasterResumeSchema,
  promoteTailoredResumeSchema,
  revertActiveResumeSchema,
  deleteMasterResumeSchema,
} from "@/actions/resume.schema";
import {
  scoreJobSchema,
  tailoredResumeActionSchema,
} from "@/actions/job.schema";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runMultiResumeUnitTests() {
  console.log("Running Step 21 Multi-Resume Personas unit tests...\n");

  // 1. Schema Definitions & Enums
  console.log("1. Verifying schema columns and enums...");
  assert(
    masterResumeSourceEnum.enumValues.includes("uploaded") &&
      masterResumeSourceEnum.enumValues.includes("promoted_tailored"),
    "master_resume_source enum must contain 'uploaded' and 'promoted_tailored'"
  );

  assert(
    masterResume.source !== undefined,
    "masterResume table must have 'source' column"
  );
  assert(
    masterResume.promotedFromTailoredResumeId !== undefined,
    "masterResume table must have 'promotedFromTailoredResumeId' column"
  );
  assert(
    masterResume.label !== undefined,
    "masterResume table must have 'label' column"
  );
  assert(
    masterResume.version !== undefined,
    "masterResume table must have 'version' column"
  );
  assert(
    masterResume.isActive !== undefined,
    "masterResume table must have 'isActive' column"
  );
  assert(
    masterResume.language !== undefined,
    "masterResume table must have 'language' column"
  );
  assert(
    tailoredResume.language !== undefined,
    "tailoredResume table must have 'language' column"
  );
  console.log("✓ Schema columns and enum values verified.");

  // 2. Action Input Validation Schemas
  console.log("2. Verifying server action schemas...");

  // createMasterResumeSchema
  const validCreate = createMasterResumeSchema.safeParse({
    label: "Backend Persona",
    content: "Experienced with Go, Node.js, and Postgres.",
    language: "en",
  });
  assert(validCreate.success, "createMasterResumeSchema should accept valid payload");

  const invalidCreate = createMasterResumeSchema.safeParse({
    label: "Backend Persona",
    content: "", // empty content
  });
  assert(!invalidCreate.success, "createMasterResumeSchema should reject empty content");

  // updateMasterResumeSchema
  const validUpdate = updateMasterResumeSchema.safeParse({
    id: "a0000000-0000-4000-8000-000000000001",
    label: "Updated Label",
  });
  assert(validUpdate.success, "updateMasterResumeSchema should accept valid id and partial fields");

  // promoteTailoredResumeSchema
  const validPromote = promoteTailoredResumeSchema.safeParse({
    tailoredResumeId: "b0000000-0000-4000-8000-000000000002",
    label: "Promoted Staff Persona",
  });
  assert(validPromote.success, "promoteTailoredResumeSchema should accept valid tailoredResumeId and label");

  const invalidPromote = promoteTailoredResumeSchema.safeParse({
    tailoredResumeId: "not-a-uuid",
  });
  assert(!invalidPromote.success, "promoteTailoredResumeSchema should reject invalid UUID");

  // revertActiveResumeSchema
  const validRevert = revertActiveResumeSchema.safeParse({
    previousActiveId: "c0000000-0000-4000-8000-000000000003",
  });
  assert(validRevert.success, "revertActiveResumeSchema should accept valid previousActiveId UUID");

  // deleteMasterResumeSchema
  const validDelete = deleteMasterResumeSchema.safeParse({
    resumeId: "d0000000-0000-4000-8000-000000000004",
  });
  assert(validDelete.success, "deleteMasterResumeSchema should accept valid resumeId UUID");

  console.log("✓ Server action schemas verified.");

  // 3. Optional resumeId in Scoring and Tailoring schemas
  console.log("3. Verifying optional resumeId in job actions...");
  const validScoreWithResume = scoreJobSchema.safeParse({
    jobId: "e0000000-0000-4000-8000-000000000005",
    idempotencyKey: "f0000000-0000-4000-8000-000000000006",
    resumeId: "a0000000-0000-4000-8000-000000000001",
  });
  assert(validScoreWithResume.success, "scoreJobSchema should accept optional resumeId");
  assert(
    validScoreWithResume.data?.resumeId === "a0000000-0000-4000-8000-000000000001",
    "resumeId should be parsed correctly"
  );

  const validScoreWithoutResume = scoreJobSchema.safeParse({
    jobId: "e0000000-0000-4000-8000-000000000005",
    idempotencyKey: "f0000000-0000-4000-8000-000000000006",
  });
  assert(validScoreWithoutResume.success, "scoreJobSchema should remain backwards compatible without resumeId");

  const validTailorWithResume = tailoredResumeActionSchema.safeParse({
    jobId: "e0000000-0000-4000-8000-000000000005",
    idempotencyKey: "f0000000-0000-4000-8000-000000000006",
    resumeId: "a0000000-0000-4000-8000-000000000001",
  });
  assert(validTailorWithResume.success, "tailoredResumeActionSchema should accept optional resumeId");

  console.log("✓ Job action schemas accept optional resumeId for persona routing.");

  console.log("\n✓ All Step 21 Multi-Resume Personas unit tests passed successfully!");
}

runMultiResumeUnitTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
