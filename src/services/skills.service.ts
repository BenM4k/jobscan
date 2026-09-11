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
import { withCostTracking } from "@/services/ai/with-cost-tracking";

export { normalizeSkillName } from "./skills/normalize";

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

export const matchAnalysisSchema = z.object({
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
  explanation: z
    .string()
    .describe(
      "A 1-2 sentence, specific and concrete rationale explaining why this candidate matches or does not match this job posting, citing specific technologies and experience. Avoid generic filler."
    ),
});

export type ExtractSkillsResult = z.infer<typeof extractSkillsSchema>;
export type ExtractCombinedSkillsResult = z.infer<typeof extractCombinedSkillsSchema>;
export type MatchAnalysisResult = z.infer<typeof matchAnalysisSchema>;

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

/**
 * Step 13: Builds the bilingual prompt for combined match analysis.
 * Branches on French vs English based on job.language.
 */
export function buildMatchAnalysisPrompt(
  jobDescription: string,
  resumeContent: string,
  language: "en" | "fr" = "en"
): { system: string; prompt: string } {
  const isFrench = language === "fr";

  const system = isFrench
    ? "Vous êtes un recruteur technique expert et un spécialiste de l'évaluation des talents. Analysez l'offre d'emploi et le CV du candidat. Extrayez : 1) toutes les compétences techniques et de domaine requises/souhaitées ('jobSkills'), 2) toutes les compétences démontrées dans le CV ('resumeSkills'), et 3) une justification spécifique et concrète de 1 à 2 phrases expliquant l'adéquation ('explanation'), sans formules génériques."
    : "You are an expert technical recruiter and talent assessment evaluator. Analyze the job posting and candidate resume. Extract: 1) all required/preferred technical and domain skills in the job description ('jobSkills'), 2) all demonstrated technical and domain skills in the candidate resume ('resumeSkills'), and 3) a 1-2 sentence, specific and concrete rationale ('explanation') citing exact technologies and experience, with no generic filler.";

  const prompt = isFrench
    ? `OFFRE D'EMPLOI CIBLE:
${jobDescription}

CV DU CANDIDAT:
${resumeContent}

Directives de sortie:
1. 'jobSkills': Liste exhaustive des compétences requises/souhaitées.
2. 'resumeSkills': Liste exhaustive des compétences démontrées dans le CV.
3. 'explanation': Rédigez 1 à 2 phrases spécifiques et concrètes en français expliquant pourquoi le profil correspond ou non à cette offre, en citant les compétences clés et les éventuelles lacunes.`
    : `TARGET JOB POSTING:
${jobDescription}

CANDIDATE RESUME:
${resumeContent}

Output Directives:
1. 'jobSkills': Exhaustive list of required/preferred skills from the job posting.
2. 'resumeSkills': Exhaustive list of demonstrated skills from the candidate resume.
3. 'explanation': Provide a 1-2 sentence concrete, specific rationale in English explaining match alignment and core gaps, without generic filler.`;

  return { system, prompt };
}

/**
 * Step 13: Option B — Single combined function for job-resume match analysis.
 * Extracts jobSkills, resumeSkills, and 'Why this matched' explanation in one LLM call.
 */
export async function analyzeJobResumeMatch(
  jobDescription: string,
  resumeContent: string,
  language: "en" | "fr" = "en",
  userId?: string | null,
  preferredProvider?: string
): Promise<Result<MatchAnalysisResult, AppError>> {
  try {
    const model = resolveLanguageModel(preferredProvider);
    const { system, prompt } = buildMatchAnalysisPrompt(
      jobDescription,
      resumeContent,
      language
    );

    const result = await withCostTracking(
      {
        userId: userId ?? null,
        feature: "scoring",
        provider: preferredProvider || "gemini",
        model: AI_MODEL,
      },
      async () => {
        return await generateText({
          model,
          output: Output.object({ schema: matchAnalysisSchema }),
          system,
          prompt,
        });
      }
    );

    return ok({
      jobSkills: result.output.jobSkills || [],
      resumeSkills: result.output.resumeSkills || [],
      explanation: result.output.explanation || "",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return err(
      new AppError("AI_EXECUTION_ERROR", `Match analysis failed: ${message}`, error)
    );
  }
}

/**
 * Step 12/13: Skill-gap analysis using the combined match analysis function.
 * Calls analyzeJobResumeMatch in a single LLM call, computes matched/missing skills,
 * and persists to job_skill and resume_skill relational tables.
 */
export async function analyzeSkillGap(
  jobId: string,
  resumeId: string,
  jobDescription: string,
  resumeContent: string,
  language: "en" | "fr" = "en",
  userId?: string,
  preferredProvider?: string
): Promise<
  Result<
    {
      jobSkills: string[];
      resumeSkills: string[];
      matchedSkills: string[];
      missingSkills: string[];
      explanation: string;
    },
    AppError
  >
> {
  const matchRes = await analyzeJobResumeMatch(
    jobDescription,
    resumeContent,
    language,
    userId,
    preferredProvider
  );

  if (!matchRes.ok) return err(matchRes.error);

  const { jobSkills, resumeSkills, explanation } = matchRes.value;
  const { matchedSkills, missingSkills } = diffSkills(jobSkills, resumeSkills);

  // Persist extracted skills to relational tables (deduped by normalized name)
  await Promise.all([
    skillsDal.syncJobSkills(jobId, jobSkills),
    resumeDal.syncResumeSkills(resumeId, resumeSkills),
  ]);

  return ok({
    jobSkills,
    resumeSkills,
    matchedSkills,
    missingSkills,
    explanation,
  });
}

