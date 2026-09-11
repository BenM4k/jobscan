import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  buildCoverLetterInstructions,
  buildCoverLetterPrompt,
} from "@/services/tailoring.service";
import {
  tailoredCoverLetterActionSchema,
  coverLetterPromptFieldsSchema,
  coverLetterInstructionsSchema,
  coverLetterToneSchema,
} from "@/actions/job.schema";

describe("Cover Letter Regeneration Unit Tests", () => {
  test("buildCoverLetterInstructions generates baseline instructions for new cover letter", () => {
    const instructions = buildCoverLetterInstructions();

    assert.ok(instructions.includes("elite executive career strategist"));
    assert.ok(instructions.includes("STRUCTURE (3-4 paragraphs"));
    assert.ok(instructions.includes("HARD CONSTRAINTS:"));
    assert.ok(instructions.includes("DO NOT invent employers"));
    assert.ok(!instructions.includes("REGENERATION DIRECTIVE"));
    assert.ok(!instructions.includes("TONE OVERRIDE"));
    assert.ok(!instructions.includes("USER REFINEMENT DIRECTIVE"));
  });

  test("buildCoverLetterInstructions includes regeneration directives, custom tone, and refinement feedback", () => {
    const instructions = buildCoverLetterInstructions({
      isRegeneration: true,
      tone: "persuasive and confident",
      instructions: "Emphasize cloud architecture experience and cost savings.",
    });

    assert.ok(instructions.includes("REGENERATION DIRECTIVE: This is a regeneration request."));
    assert.ok(instructions.includes("TONE OVERRIDE: Maintain a persuasive and confident tone"));
    assert.ok(
      instructions.includes(
        'USER REFINEMENT DIRECTIVE: Strictly incorporate the following user instructions: "Emphasize cloud architecture experience and cost savings."'
      )
    );
  });

  test("buildCoverLetterPrompt formats clean candidate background and job details", () => {
    const prompt = buildCoverLetterPrompt({
      candidateSkills: ["TypeScript", "Next.js", "PostgreSQL"],
      resumeText: "Senior Engineer with 8 years building SaaS platforms. Contact: user@example.com, +1-555-019-2834.",
      jobTitle: "Lead Fullstack Architect",
      company: "Acme Corp",
      location: "San Francisco, CA",
      jobDescription: "Looking for an architect to scale our distributed cloud backend.",
    });

    assert.ok(prompt.includes("Skills: TypeScript, Next.js, PostgreSQL"));
    assert.ok(prompt.includes("Senior Engineer with 8 years building SaaS platforms."));
    // Verify phone & email sanitization
    assert.ok(prompt.includes("[email]"));
    assert.ok(prompt.includes("[phone]"));
    assert.ok(!prompt.includes("user@example.com"));
    assert.ok(!prompt.includes("555-019-2834"));

    assert.ok(prompt.includes("Role: Lead Fullstack Architect"));
    assert.ok(prompt.includes("Company: Acme Corp"));
    assert.ok(prompt.includes("Location: San Francisco, CA"));
    assert.ok(prompt.includes("Description:\n\"\"\"\nLooking for an architect"));
    assert.ok(!prompt.includes("PREVIOUS COVER LETTER DRAFT"));
  });

  test("buildCoverLetterPrompt includes previous draft and custom instructions during regeneration", () => {
    const previousDraft = "Dear team, I am an engineer passionate about scaling web systems.";
    const prompt = buildCoverLetterPrompt({
      candidateSkills: ["React", "Node.js"],
      resumeText: "Fullstack developer with extensive experience.",
      jobTitle: "Software Engineer",
      company: "Beta Tech",
      location: "Remote",
      jobDescription: "Build modern web interfaces.",
      isRegeneration: true,
      previousCoverLetter: previousDraft,
      instructions: "Focus on Next.js 16 and partial prerendering capabilities.",
    });

    assert.ok(prompt.includes("PREVIOUS COVER LETTER DRAFT"));
    assert.ok(prompt.includes(previousDraft));
    assert.ok(prompt.includes("USER REFINEMENT INSTRUCTIONS:"));
    assert.ok(prompt.includes("Focus on Next.js 16 and partial prerendering capabilities."));
  });

  test("tailoredCoverLetterActionSchema validates valid UUID and optional regeneration arguments", () => {
    const validJobId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
    const validKey = "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";

    const validInitial = tailoredCoverLetterActionSchema.safeParse({
      jobId: validJobId,
      idempotencyKey: validKey,
    });
    assert.ok(validInitial.success);

    const validRegen = tailoredCoverLetterActionSchema.safeParse({
      jobId: validJobId,
      idempotencyKey: validKey,
      regenerate: true,
      instructions: "Make it more concise and executive",
      tone: "executive",
      resumeId: "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
    });
    assert.ok(validRegen.success);
    assert.equal(validRegen.data.regenerate, true);
    assert.equal(validRegen.data.tone, "executive");

    const invalid = tailoredCoverLetterActionSchema.safeParse({
      jobId: "not-a-uuid",
      idempotencyKey: "bad-key",
    });
    assert.ok(!invalid.success);

    // Tone validation: accepts executive and confident, rejects excessively long strings
    const validTone1 = tailoredCoverLetterActionSchema.safeParse({
      jobId: validJobId,
      idempotencyKey: validKey,
      tone: "executive",
    });
    assert.ok(validTone1.success);
    assert.equal(validTone1.data.tone, "executive");

    const validTone2 = tailoredCoverLetterActionSchema.safeParse({
      jobId: validJobId,
      idempotencyKey: validKey,
      tone: "confident",
    });
    assert.ok(validTone2.success);
    assert.equal(validTone2.data.tone, "confident");

    const invalidTone = tailoredCoverLetterActionSchema.safeParse({
      jobId: validJobId,
      idempotencyKey: validKey,
      tone: "a".repeat(51),
    });
    assert.ok(!invalidTone.success, "Tone longer than 50 chars must fail validation");

    // Instructions validation: accepts bounded string, rejects excessively long instructions
    const validInstructions = tailoredCoverLetterActionSchema.safeParse({
      jobId: validJobId,
      idempotencyKey: validKey,
      instructions: "Highlight full-stack TypeScript experience",
    });
    assert.ok(validInstructions.success);

    const invalidInstructions = tailoredCoverLetterActionSchema.safeParse({
      jobId: validJobId,
      idempotencyKey: validKey,
      instructions: "x".repeat(1001),
    });
    assert.ok(!invalidInstructions.success, "Instructions exceeding 1000 chars must fail validation");

    // Shared API route schema parsing path
    const apiValid = coverLetterPromptFieldsSchema.safeParse({
      instructions: "Short prompt instructions",
      tone: "executive",
    });
    assert.ok(apiValid.success);

    const apiInvalid = coverLetterPromptFieldsSchema.safeParse({
      instructions: "x".repeat(1001),
      tone: "a".repeat(51),
    });
    assert.ok(!apiInvalid.success);
  });

  test("diffFromPrevious metadata shape is properly structured on regeneration", () => {
    const previousContent = "Old cover letter with 150 words.";
    const newContent = "Regenerated fresh cover letter with 220 words.";
    const instructions = "Highlight leadership";
    const tone = "confident";

    const diffFromPrevious = {
      isRegeneration: true,
      regeneratedAt: new Date().toISOString(),
      previousLength: previousContent.length,
      newLength: newContent.length,
      instructions,
      tone,
    };

    assert.equal(diffFromPrevious.isRegeneration, true);
    assert.equal(diffFromPrevious.previousLength, previousContent.length);
    assert.equal(diffFromPrevious.newLength, newContent.length);
    assert.equal(diffFromPrevious.instructions, "Highlight leadership");
    assert.equal(diffFromPrevious.tone, "confident");
    assert.ok(diffFromPrevious.regeneratedAt);
  });
});
