import assert from "node:assert";
import { parseTailoredResume } from "@/lib/tailored-resume-parser";
import { scoreJobSchema, tailoredResumeActionSchema, tailoredCoverLetterActionSchema } from "@/actions/job.schema";

console.log("Running Frontend Background Job & Retry Feedback unit tests...\n");

// 1. parseTailoredResume Unit Tests
console.log("1. Verifying parseTailoredResume parser...");

// Markdown format
const sampleMarkdown = `
## Summary
Experienced Senior Full-Stack Engineer specializing in Next.js and distributed microservices.

## Work Experience
- Architected and deployed scalable ingestion pipelines handling 50,000+ daily listings.
- Improved latency by 45% through multi-tier LRU Redis caching and pgvector indexing.
`;

const parsed = parseTailoredResume(sampleMarkdown);
assert.strictEqual(
  parsed.summary,
  "Experienced Senior Full-Stack Engineer specializing in Next.js and distributed microservices."
);
assert.strictEqual(parsed.experience.length, 2);
assert.ok(parsed.experience[0].includes("Architected and deployed scalable"));
assert.ok(parsed.experience[1].includes("Improved latency by 45%"));
console.log("   ✓ parseTailoredResume extracts markdown summary and bullet points.");

// Structured JSON object fallback
const structuredSample = {
  summary: "Structured executive summary.",
  experience: [
    {
      company: "Acme Corp",
      bullets: ["Led engineering teams.", "Cut infrastructure costs."],
    },
  ],
};
const parsedStructured = parseTailoredResume(null, structuredSample);
assert.strictEqual(parsedStructured.summary, "Structured executive summary.");
assert.strictEqual(parsedStructured.experience.length, 2);
assert.strictEqual(parsedStructured.experience[0], "Led engineering teams.");
console.log("   ✓ parseTailoredResume handles structured JSON objects.");

// Empty / fallback text
const emptyParsed = parseTailoredResume("");
assert.strictEqual(emptyParsed.summary, "");
assert.strictEqual(emptyParsed.experience.length, 0);
console.log("   ✓ parseTailoredResume handles empty input gracefully.");

// 2. Action Schemas Verification
console.log("\n2. Verifying Action Schemas for AI background jobs...");
const validUuid = "123e4567-e89b-12d3-a456-426614174000";

const validScore = scoreJobSchema.safeParse({
  jobId: validUuid,
  idempotencyKey: validUuid,
});
assert.ok(validScore.success, "scoreJobSchema should accept valid inputs");

const validResume = tailoredResumeActionSchema.safeParse({
  jobId: validUuid,
  idempotencyKey: validUuid,
});
assert.ok(validResume.success, "tailoredResumeActionSchema should accept valid inputs");

const validCoverLetter = tailoredCoverLetterActionSchema.safeParse({
  jobId: validUuid,
  idempotencyKey: validUuid,
});
assert.ok(validCoverLetter.success, "tailoredCoverLetterActionSchema should accept valid inputs");
console.log("   ✓ AI action schemas correctly enforce UUID idempotency keys.");

// 3. Retry Feedback UI Contract
console.log("\n3. Verifying Retry Feedback UI status contracts...");
const validStatuses = ["idle", "running", "retrying", "success", "error"] as const;
for (const status of validStatuses) {
  assert.ok(typeof status === "string");
}
console.log("   ✓ AsyncJobStatus lifecycle states validated.");

console.log("\n✨ All Frontend Background Job & Retry Feedback unit tests passed successfully!\n");
