import { z } from "zod";
import { Result } from "@/lib/result";
import { AppError } from "@/lib/errors";

export const scoreResultSchema = z.object({
  fitScore: z.number().min(0).max(100).describe("Match fit score between 0 and 100"),
  explanation: z.string().describe("A concise 1-2 sentence 'Why this matched' explanation string summarizing match alignment and key strengths or core missing requirements"),
  scoreReasoning: z.string().optional().default("").describe("Detailed 2-3 sentence explanation of match alignment and key strengths"),
  jobSkills: z.array(z.string()).optional().default([]).describe("Key technical, domain, and qualification skills extracted directly from the job description"),
  resumeSkills: z.array(z.string()).optional().default([]).describe("Key technical, domain, and qualification skills extracted directly from the candidate's resume"),
  matchedSkills: z.array(z.string()).describe("Candidate skills and qualifications explicitly matched to the job description").optional().default([]),
  missingSkills: z.array(z.string()).describe("Important skills, qualifications, or requirements from the job description missing or not demonstrated").optional().default([]),
});

export type ScoreResult = z.infer<typeof scoreResultSchema>;

/** Usage metadata captured from the provider's generateText response. */
export interface ScoreUsage {
  inputTokens?: number;
  outputTokens?: number;
  modelId: string;
}

export type AIProviderName = "claude" | "gemini" | "openai" | "gateway";

/** The full value returned by a scoring provider: the score plus token usage. */
export type ScoreWithUsage = ScoreResult & { _usage: ScoreUsage };

export interface ScoringProvider {
  name: AIProviderName;
  modelId: string;
  scoreJob(
    jobTitle: string,
    jobDescription: string,
    resumeText: string,
    skills: string[]
  ): Promise<Result<ScoreWithUsage, AppError>>;
}

/**
 * Static system instructions for the scoring AI — passed via the `system` field
 * in `generateText` with `Output.object()`.
 */
export const SCORING_INSTRUCTIONS = `You are an elite executive career strategist, technical recruiter, and professional resume builder.
Your task is to analyze the candidate's background against the target job description, score the match, and extract all relevant skills.

IMPORTANT DIRECTIVES:
1. MATCH EXPLANATION: Write a concise 1-2 sentence "Why this matched" explanation string summarizing the core reasons for this match score (key alignments or major missing qualifications).
2. SKILL EXTRACTION:
   - Extract an exhaustive list of key technical and domain skills required or preferred in the job description into 'jobSkills'.
   - Extract an exhaustive list of key technical and domain skills demonstrated in the candidate's resume into 'resumeSkills'.
3. Keep all generated details professional, realistic, and authentic for a candidate with this profile.`;

/**
 * Builds the user-turn prompt containing the candidate data and target job.
 * Pair with {@link SCORING_INSTRUCTIONS} via the `instructions` option.
 */
export function buildScoringUserPrompt(
  jobTitle: string,
  jobDescription: string,
  resumeText: string,
  skills: string[]
): string {
  return `Candidate Base Resume:
${resumeText}

Candidate Skills:
${skills.join(", ")}

Job Title:
${jobTitle}

Job Description:
${jobDescription}`;
}

