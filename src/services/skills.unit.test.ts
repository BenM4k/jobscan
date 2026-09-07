import { diffSkills, normalizeSkill } from "./skills.service";
import * as skillsService from "./skills.service";
import * as skillsDal from "@/dal/skills.dal";
import { scoreResultSchema } from "./scoring/types";

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
