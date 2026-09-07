import "server-only";
import { z } from "zod";
import { generateText, Output } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { gateway } from "@ai-sdk/gateway";
import { AI_MODEL } from "@/lib/ai";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";
import * as skillsDal from "@/dal/skills.dal";
import * as resumeDal from "@/dal/resume.dal";

export const extractSkillsSchema = z.object({
  skills: z
    .array(z.string())
    .describe(
      "Extracted technical and domain skills, competencies, tools, programming languages, and frameworks"
    ),
});

export const extractCombinedSkillsSchema = z.object({
  jobSkills: z
    .array(z.string())
    .describe(
      "Comprehensive list of technical and domain skills, qualifications, and competencies required or preferred by the job description"
    ),
  resumeSkills: z
    .array(z.string())
    .describe(
      "Comprehensive list of technical and domain skills, qualifications, and competencies demonstrated in the candidate's resume"
    ),
});

export type ExtractSkillsResult = z.infer<typeof extractSkillsSchema>;
export type ExtractCombinedSkillsResult = z.infer<typeof extractCombinedSkillsSchema>;

/**
 * Normalizes a skill string for naive comparison (casing, trimming, and separator normalization).
 */
export function normalizeSkill(skill: string): string {
  return skill
    .toLowerCase()
    .trim()
    .replace(/[._\-\/]+/g, " ")
    .replace(/\s+/g, " ");
}

/**
 * Naive skill-gap diffing algorithm.
 * Compares job skills against candidate resume skills using normalized string matching.
 */
export function diffSkills(
  jobSkills: string[],
  resumeSkills: string[]
): { matchedSkills: string[]; missingSkills: string[] } {
  // Deduplicate case-insensitively while preserving first seen presentation
  const seenJob = new Set<string>();
  const cleanJobSkills: string[] = [];
  for (const s of jobSkills) {
    const trimmed = s.trim();
    if (!trimmed) continue;
    const norm = normalizeSkill(trimmed);
    if (!seenJob.has(norm)) {
      seenJob.add(norm);
      cleanJobSkills.push(trimmed);
    }
  }

  const seenResume = new Set<string>();
  const cleanResumeSkills: string[] = [];
  for (const s of resumeSkills) {
    const trimmed = s.trim();
    if (!trimmed) continue;
    const norm = normalizeSkill(trimmed);
    if (!seenResume.has(norm)) {
      seenResume.add(norm);
      cleanResumeSkills.push(trimmed);
    }
  }

  const normalizedResumeSkills = new Set(
    cleanResumeSkills.map((s) => normalizeSkill(s))
  );

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const js of cleanJobSkills) {
    const normalized = normalizeSkill(js);
    if (normalizedResumeSkills.has(normalized)) {
      matchedSkills.push(js);
    } else {
      // Check if resume contains a sub-phrase or variant (e.g. "PostgreSQL" in "Postgres", "React" in "React.js")
      const matchesVariant = Array.from(normalizedResumeSkills).some(
        (rs) =>
          rs === normalized ||
          (normalized.length > 3 && rs.length > 3 && (rs.includes(normalized) || normalized.includes(rs)))
      );

      if (matchesVariant) {
        matchedSkills.push(js);
      } else {
        missingSkills.push(js);
      }
    }
  }

  return { matchedSkills, missingSkills };
}

/**
 * Resolves a model instance for structured text generation across configured providers.
 */
function resolveLanguageModel(preferredProvider?: string) {
  const provider = (
    preferredProvider ||
    process.env.AI_PROVIDER ||
    "gemini"
  ).toLowerCase();

  switch (provider) {
    case "claude": {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");
      const anthropic = createAnthropic({ apiKey });
      return anthropic("claude-3-5-sonnet-latest");
    }
    case "openai": {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
      const openai = createOpenAI({ apiKey });
      return openai("gpt-4o");
    }
    case "gateway": {
      const modelName = process.env.AI_GATEWAY_MODEL || "openai/gpt-4o";
      return gateway(modelName);
    }
    case "gemini":
    default: {
      const apiKey =
        process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
      const google = createGoogleGenerativeAI({ apiKey });
      return google(AI_MODEL);
    }
  }
}

/**
 * One LLM call with structured JSON output to extract skills from a Job Description.
 */
export async function extractSkillsFromJob(
  jobTitle: string,
  jobDescription: string,
  preferredProvider?: string
): Promise<Result<string[], AppError>> {
  try {
    const model = resolveLanguageModel(preferredProvider);
    const result = await generateText({
      model,
      output: Output.object({ schema: extractSkillsSchema }),
      system:
        "You are an expert technical recruiter and talent taxonomist. Extract an exhaustive list of core technical skills, programming languages, libraries, frameworks, cloud tools, domain knowledge, and required certifications from the provided job posting.",
      prompt: `Job Title: ${jobTitle}\n\nJob Description:\n${jobDescription}`,
    });

    return ok(result.output.skills || []);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return err(
      new AppError("AI_EXECUTION_ERROR", `Failed to extract skills from JD: ${message}`, error)
    );
  }
}

/**
 * One LLM call with structured JSON output to extract skills from a Resume.
 */
export async function extractSkillsFromResume(
  resumeText: string,
  preferredProvider?: string
): Promise<Result<string[], AppError>> {
  try {
    const model = resolveLanguageModel(preferredProvider);
    const result = await generateText({
      model,
      output: Output.object({ schema: extractSkillsSchema }),
      system:
        "You are an expert technical recruiter and resume parser. Extract an exhaustive list of technical skills, technologies, software, languages, frameworks, domain capabilities, and credentials explicitly demonstrated in the candidate's resume.",
      prompt: `Candidate Resume:\n${resumeText}`,
    });

    return ok(result.output.skills || []);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return err(
      new AppError("AI_EXECUTION_ERROR", `Failed to extract skills from resume: ${message}`, error)
    );
  }
}

/**
 * One combined LLM call with structured JSON output to extract skills from both the JD and the Resume.
 */
export async function extractSkillsCombined(
  jobTitle: string,
  jobDescription: string,
  resumeText: string,
  preferredProvider?: string
): Promise<Result<{ jobSkills: string[]; resumeSkills: string[] }, AppError>> {
  try {
    const model = resolveLanguageModel(preferredProvider);
    const result = await generateText({
      model,
      output: Output.object({ schema: extractCombinedSkillsSchema }),
      system:
        "You are an expert technical recruiter and talent assessment evaluator. Analyze the job posting and candidate resume. Extract: 1) all required/preferred skills in the job description ('jobSkills'), and 2) all demonstrated skills in the candidate resume ('resumeSkills').",
      prompt: `TARGET JOB POSTING:
Title: ${jobTitle}
Description:
${jobDescription}

CANDIDATE RESUME:
${resumeText}`,
    });

    return ok({
      jobSkills: result.output.jobSkills || [],
      resumeSkills: result.output.resumeSkills || [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return err(
      new AppError("AI_EXECUTION_ERROR", `Combined skill extraction failed: ${message}`, error)
    );
  }
}

/**
 * End-to-end naive skill-gap analysis:
 * 1. Extracts skills (via one combined call or two parallel separate calls).
 * 2. Diffs the two arrays into matchedSkills and missingSkills.
 * 3. Writes extracted skills into job_skill and resume_skill relational tables.
 * 4. Returns the full analysis payload.
 */
export async function performSkillGapAnalysis(params: {
  jobId: string;
  resumeId: string;
  jobTitle: string;
  jobDescription: string;
  resumeText: string;
  mode?: "combined" | "separate";
  preferredProvider?: string;
}): Promise<
  Result<
    {
      jobSkills: string[];
      resumeSkills: string[];
      matchedSkills: string[];
      missingSkills: string[];
    },
    AppError
  >
> {
  const {
    jobId,
    resumeId,
    jobTitle,
    jobDescription,
    resumeText,
    mode = "combined",
    preferredProvider,
  } = params;

  let jobSkills: string[] = [];
  let resumeSkills: string[] = [];

  if (mode === "separate") {
    const [jobRes, resumeRes] = await Promise.all([
      extractSkillsFromJob(jobTitle, jobDescription, preferredProvider),
      extractSkillsFromResume(resumeText, preferredProvider),
    ]);

    if (!jobRes.ok) return err(jobRes.error);
    if (!resumeRes.ok) return err(resumeRes.error);

    jobSkills = jobRes.value;
    resumeSkills = resumeRes.value;
  } else {
    const combinedRes = await extractSkillsCombined(
      jobTitle,
      jobDescription,
      resumeText,
      preferredProvider
    );
    if (!combinedRes.ok) return err(combinedRes.error);

    jobSkills = combinedRes.value.jobSkills;
    resumeSkills = combinedRes.value.resumeSkills;
  }

  // Naive array diffing
  const { matchedSkills, missingSkills } = diffSkills(jobSkills, resumeSkills);

  // Persist extracted skills to relational tables
  const [jobSkillSync, resumeSkillSync] = await Promise.all([
    skillsDal.syncJobSkills(jobId, jobSkills),
    resumeDal.syncResumeSkills(resumeId, resumeSkills),
  ]);

  if (!jobSkillSync.ok) {
    console.warn("Failed to sync job skills to job_skill:", jobSkillSync.error);
  }
  if (!resumeSkillSync.ok) {
    console.warn("Failed to sync resume skills to resume_skill:", resumeSkillSync.error);
  }

  return ok({
    jobSkills,
    resumeSkills,
    matchedSkills,
    missingSkills,
  });
}
