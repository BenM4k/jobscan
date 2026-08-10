import { Result } from "@/lib/result";
import { AppError } from "@/lib/errors";

export interface ScoreResult {
  fitScore: number; // 0 - 100
  scoreReasoning: string;
  coverLetterDraft: string;
  tailoredResume: string;
}


export type AIProviderName = "claude" | "gemini" | "openai";

export interface ScoringProvider {
  name: AIProviderName;
  scoreJob(
    jobTitle: string,
    jobDescription: string,
    resumeText: string,
    skills: string[]
  ): Promise<Result<ScoreResult, AppError>>;
}
