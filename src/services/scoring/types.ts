import { z } from "zod";
import { Result } from "@/lib/result";
import { AppError } from "@/lib/errors";

export const scoreResultSchema = z.object({
  fitScore: z.number().min(0).max(100).describe("Match fit score between 0 and 100"),
  scoreReasoning: z.string().describe("Detailed 2-3 sentence explanation of match alignment and key strengths"),
  coverLetterDraft: z.string().describe("A compelling, highly customized multi-paragraph cover letter tailored specifically to this role and company with realistic value propositions"),
  tailoredResume: z.string().describe("A complete, professionally formatted tailored resume with summary, skills, and newly generated realistic bullet points tailored directly to the job description requirements"),
});

export type ScoreResult = z.infer<typeof scoreResultSchema>;

export type AIProviderName = "claude" | "gemini" | "openai" | "gateway";

export interface ScoringProvider {
  name: AIProviderName;
  scoreJob(
    jobTitle: string,
    jobDescription: string,
    resumeText: string,
    skills: string[]
  ): Promise<Result<ScoreResult, AppError>>;
}

/**
 * Static system instructions for the scoring AI — passed via the `system` field
 * in `generateText` with `Output.object()`.
 */
export const SCORING_INSTRUCTIONS = `You are an elite executive career strategist, technical recruiter, and professional resume builder.
Your task is to analyze the candidate's background and create a custom tailored resume and cover letter engineered specifically for this target job position.

IMPORTANT CREATIVE TAILORING DIRECTIVES:
1. DO NOT simply copy-paste verbatim text from the candidate's base resume.
2. TAILORED RESUME: Synthesize the candidate's core domain experience and skills. Transform and generate new, realistic, highly-tailored experience bullet points, accomplishments, technical skills, and quantifiable metrics that directly match the specific key requirements, responsibilities, and technologies requested in the target job description.
3. COVER LETTER: Write a compelling, highly realistic, position-specific cover letter draft. Connect the candidate's background to the target company's mission and role requirements without repeating verbatim resume text. Generate realistic value propositions and enthusiasm for the position.
4. Keep all generated details professional, realistic, and authentic for a candidate with this profile.`;

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

