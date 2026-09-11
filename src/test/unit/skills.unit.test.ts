import { diffSkills, normalizeSkill, normalizeSkillName } from "@/services/skills.service";
import * as skillsService from "@/services/skills.service";
import { normalizeSkillName as normalizeSkillNameDirect } from "@/services/skills/normalize";
import * as skillsDal from "@/dal/skills.dal";
import { scoreResultSchema } from "@/services/scoring/types";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runSkillsUnitTests() {
  console.log("Running Skills & Explanation unit tests...\n");

  // 1. Check exports on skills.service and skills.dal
  assert(
    typeof skillsService.diffSkills === "function",
    "diffSkills should be exported from skills.service"
  );
  assert(
    typeof skillsService.normalizeSkill === "function",
    "normalizeSkill should be exported from skills.service"
  );
  assert(
    typeof skillsService.normalizeSkillName === "function",
    "normalizeSkillName should be exported from skills.service"
  );
  assert(
    typeof normalizeSkillNameDirect === "function",
    "normalizeSkillName should be exported from @/services/skills/normalize"
  );
  assert(
    typeof skillsService.analyzeJobResumeMatch === "function",
    "analyzeJobResumeMatch should be exported from skills.service"
  );
  assert(
    typeof skillsService.analyzeSkillGap === "function",
    "analyzeSkillGap should be exported from skills.service"
  );
  assert(
    typeof skillsService.buildMatchAnalysisPrompt === "function",
    "buildMatchAnalysisPrompt should be exported from skills.service"
  );
  assert(
    typeof skillsService.extractSkillsFromJob === "function",
    "extractSkillsFromJob should be exported from skills.service"
  );
  assert(
    typeof skillsService.extractSkillsFromResume === "function",
    "extractSkillsFromResume should be exported from skills.service"
  );
  assert(
    typeof skillsService.extractSkillsCombined === "function",
    "extractSkillsCombined should be exported from skills.service"
  );
  assert(
    typeof skillsService.performSkillGapAnalysis === "function",
    "performSkillGapAnalysis should be exported from skills.service"
  );
  assert(
    typeof skillsDal.syncJobSkills === "function",
    "syncJobSkills should be exported from skills.dal"
  );
  assert(
    typeof skillsDal.getJobSkills === "function",
    "getJobSkills should be exported from skills.dal"
  );
  assert(
    typeof skillsDal.syncResumeSkills === "function",
    "syncResumeSkills should be exported from skills.dal"
  );
  assert(
    typeof skillsDal.getResumeSkills === "function",
    "getResumeSkills should be exported from skills.dal"
  );
  console.log("✓ All expected functions are properly exported");

  // 2. Normalization tests
  assert(normalizeSkill(" TypeScript ") === "typescript", "normalizeSkill trims and lowercases");
  assert(normalizeSkill("React.js") === "react js", "normalizeSkill replaces dots with space");
  assert(normalizeSkill("Node-JS") === "node js", "normalizeSkill replaces dashes with space");
  assert(normalizeSkill("CI/CD") === "ci cd", "normalizeSkill replaces slashes with space");
  console.log("✓ normalizeSkill correctly handles punctuation and whitespace");

  // Step 12: normalizeSkillName does lowercase/trim/whitespace-collapse only (no synonym resolution)
  assert(normalizeSkillName("  JavaScript   Core  ") === "javascript core", "normalizeSkillName collapses whitespace and trims");
  assert(normalizeSkillName("JS") === "js", "normalizeSkillName does not resolve synonyms like JS->JavaScript");
  assert(normalizeSkillName("PostgreSQL") === "postgresql", "normalizeSkillName lowercases");
  assert(normalizeSkillName("") === "", "normalizeSkillName handles empty string");
  console.log("✓ normalizeSkillName does lowercase/trim/whitespace-collapse only (no synonym resolution)");

  // Step 13: Prompt branching for French vs English
  {
    const enPrompt = skillsService.buildMatchAnalysisPrompt("Software Engineer", "Resume...", "en");
    assert(enPrompt.system.includes("expert technical recruiter"), "English prompt should use English system instruction");
    assert(enPrompt.prompt.includes("TARGET JOB POSTING"), "English prompt should use TARGET JOB POSTING");

    const frPrompt = skillsService.buildMatchAnalysisPrompt("Ingénieur Logiciel", "CV...", "fr");
    assert(frPrompt.system.includes("recruteur technique expert"), "French prompt should use French system instruction");
    assert(frPrompt.prompt.includes("OFFRE D'EMPLOI CIBLE"), "French prompt should use OFFRE D'EMPLOI CIBLE");
    assert(frPrompt.prompt.includes("français"), "French prompt should request explanation in French");
  }
  console.log("✓ buildMatchAnalysisPrompt correctly branches between French and English");

  // 3. diffSkills test: Exact matches
  {
    const jobSkills = ["TypeScript", "React", "PostgreSQL"];
    const resumeSkills = ["TypeScript", "React", "PostgreSQL"];
    const { matchedSkills, missingSkills } = diffSkills(jobSkills, resumeSkills);

    assert(matchedSkills.length === 3, `Expected 3 matched skills, got ${matchedSkills.length}`);
    assert(missingSkills.length === 0, `Expected 0 missing skills, got ${missingSkills.length}`);
    assert(matchedSkills.includes("TypeScript"), "TypeScript should be matched");
    assert(matchedSkills.includes("React"), "React should be matched");
    assert(matchedSkills.includes("PostgreSQL"), "PostgreSQL should be matched");
  }
  console.log("✓ diffSkills handles exact matches");

  // 4. diffSkills test: Case-insensitive and formatting differences
  {
    const jobSkills = ["TypeScript", "React.js", "Docker", "AWS"];
    const resumeSkills = ["typescript", "react", "Node.js"];
    const { matchedSkills, missingSkills } = diffSkills(jobSkills, resumeSkills);

    assert(matchedSkills.includes("TypeScript"), "TypeScript should match typescript");
    assert(matchedSkills.includes("React.js"), "React.js should match react");
    assert(missingSkills.includes("Docker"), "Docker should be missing");
    assert(missingSkills.includes("AWS"), "AWS should be missing");
    assert(matchedSkills.length === 2, `Expected 2 matched skills, got ${matchedSkills.length}`);
    assert(missingSkills.length === 2, `Expected 2 missing skills, got ${missingSkills.length}`);
  }
  console.log("✓ diffSkills handles case-insensitivity and sub-word matches");

  // 5. diffSkills test: Empty / edge cases
  {
    const emptyJob = diffSkills([], ["TypeScript", "React"]);
    assert(emptyJob.matchedSkills.length === 0, "No job skills should produce 0 matched");
    assert(emptyJob.missingSkills.length === 0, "No job skills should produce 0 missing");

    const emptyResume = diffSkills(["TypeScript", "Python"], []);
    assert(emptyResume.matchedSkills.length === 0, "Empty resume should match nothing");
    assert(emptyResume.missingSkills.length === 2, "All job skills should be missing");

    const duplicates = diffSkills(["React", " React ", "react"], ["React"]);
    assert(duplicates.matchedSkills.length === 1, "Duplicates in job skills should be deduped");
  }
  console.log("✓ diffSkills handles empty and duplicate inputs gracefully");

  // 6. scoreResultSchema validation: "Why this matched" explanation & skill arrays
  {
    const validScoringPayload = {
      fitScore: 88,
      explanation: "Strong fit due to 5+ years of TypeScript and React experience, missing AWS deployment skills.",
      scoreReasoning: "Detailed reasoning on candidate capabilities and alignment with senior frontend role.",
      jobSkills: ["TypeScript", "React", "AWS", "Next.js"],
      resumeSkills: ["TypeScript", "React", "Next.js", "Tailwind CSS"],
      coverLetterDraft: "Dear Hiring Manager...",
      tailoredResume: "Senior Software Engineer with extensive experience in React...",
      matchedSkills: ["TypeScript", "React", "Next.js"],
      missingSkills: ["AWS"],
    };

    const parsed = scoreResultSchema.safeParse(validScoringPayload);
    assert(parsed.success, `scoreResultSchema validation failed: ${parsed.error?.message}`);
    if (parsed.success) {
      assert(parsed.data.fitScore === 88, "fitScore should be 88");
      assert(
        parsed.data.explanation.includes("Strong fit"),
        "explanation should be parsed correctly"
      );
      assert(parsed.data.jobSkills.length === 4, "jobSkills should have 4 items");
      assert(parsed.data.resumeSkills.length === 4, "resumeSkills should have 4 items");
    }

    // Default values test: jobSkills and resumeSkills should default to [] if omitted
    const minimalPayload = {
      fitScore: 75,
      explanation: "Candidate meets core requirements but lacks domain expertise.",
      coverLetterDraft: "Dear Hiring Team...",
      tailoredResume: "Professional experience...",
    };
    const parsedMinimal = scoreResultSchema.safeParse(minimalPayload);
    assert(parsedMinimal.success, `Minimal scoreResultSchema validation failed: ${parsedMinimal.error?.message}`);
    if (parsedMinimal.success) {
      assert(Array.isArray(parsedMinimal.data.jobSkills), "jobSkills defaults to array");
      assert(Array.isArray(parsedMinimal.data.resumeSkills), "resumeSkills defaults to array");
      assert(parsedMinimal.data.explanation.length > 0, "explanation is present");
    }

    // Missing explanation test: explanation is required for "Why this matched"
    const missingExplanationPayload = {
      fitScore: 75,
      coverLetterDraft: "Dear Hiring Team...",
      tailoredResume: "Professional experience...",
    };
    const parsedInvalid = scoreResultSchema.safeParse(missingExplanationPayload);
    assert(!parsedInvalid.success, "scoreResultSchema should require explanation");
  }
  console.log("✓ scoreResultSchema enforces 'Why this matched' explanation and skill arrays");

  // 7. matchAnalysisSchema validation (Step 13 Option B)
  {
    const validMatch = {
      jobSkills: ["TypeScript", "Next.js"],
      resumeSkills: ["TypeScript", "React"],
      explanation: "Matches TypeScript experience but lacks production Next.js background.",
    };
    const parsedMatch = skillsService.matchAnalysisSchema.safeParse(validMatch);
    assert(parsedMatch.success, "matchAnalysisSchema should parse valid payload");

    const invalidMatch = {
      jobSkills: ["TypeScript"],
      resumeSkills: ["TypeScript"],
    };
    const parsedInvalidMatch = skillsService.matchAnalysisSchema.safeParse(invalidMatch);
    assert(!parsedInvalidMatch.success, "matchAnalysisSchema requires explanation");
  }
  console.log("✓ matchAnalysisSchema validates combined output structure");

  // 8. resolveLanguageModel resolution of provider and model
  {
    const origAiProvider = process.env.AI_PROVIDER;
    const origGeminiKey = process.env.GEMINI_API_KEY;
    const origAnthropicKey = process.env.ANTHROPIC_API_KEY;
    const origOpenaiKey = process.env.OPENAI_API_KEY;

    try {
      process.env.GEMINI_API_KEY = "test-gemini-key";
      delete process.env.AI_PROVIDER;

      // Default with no preferredProvider and no AI_PROVIDER
      const defaultResolved = skillsService.resolveLanguageModel();
      assert(defaultResolved.provider === "gemini", `Expected provider gemini, got ${defaultResolved.provider}`);
      assert(defaultResolved.modelId.includes("gemini"), `Expected gemini modelId, got ${defaultResolved.modelId}`);

      // When AI_PROVIDER is set and preferredProvider is absent
      process.env.AI_PROVIDER = "claude";
      process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
      const claudeFromEnv = skillsService.resolveLanguageModel();
      assert(claudeFromEnv.provider === "claude", `Expected provider claude from env, got ${claudeFromEnv.provider}`);
      assert(claudeFromEnv.modelId === "claude-3-5-sonnet-latest", `Expected claude modelId, got ${claudeFromEnv.modelId}`);

      // When preferredProvider overrides AI_PROVIDER
      process.env.OPENAI_API_KEY = "test-openai-key";
      const openaiOverride = skillsService.resolveLanguageModel("openai");
      assert(openaiOverride.provider === "openai", `Expected provider openai, got ${openaiOverride.provider}`);
      assert(openaiOverride.modelId === "gpt-4o", `Expected gpt-4o, got ${openaiOverride.modelId}`);
    } finally {
      if (origAiProvider !== undefined) process.env.AI_PROVIDER = origAiProvider; else delete process.env.AI_PROVIDER;
      if (origGeminiKey !== undefined) process.env.GEMINI_API_KEY = origGeminiKey; else delete process.env.GEMINI_API_KEY;
      if (origAnthropicKey !== undefined) process.env.ANTHROPIC_API_KEY = origAnthropicKey; else delete process.env.ANTHROPIC_API_KEY;
      if (origOpenaiKey !== undefined) process.env.OPENAI_API_KEY = origOpenaiKey; else delete process.env.OPENAI_API_KEY;
    }
  }
  console.log("✓ resolveLanguageModel accurately resolves provider and model identifiers");

  console.log("\n==========================================");
  console.log("✓ All Skills & Explanation unit tests passed successfully!");
  console.log("==========================================");
}

runSkillsUnitTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  });
