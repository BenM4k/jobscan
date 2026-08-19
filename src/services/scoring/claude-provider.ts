import "server-only";
import {
  ScoringProvider,
  ScoreResult,
  AIProviderName,
  scoreResultSchema,
  buildScoringPrompt,
} from "./types";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";
import { generateObject } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";

export class ClaudeProvider implements ScoringProvider {
  name: AIProviderName = "claude";

  async scoreJob(
    jobTitle: string,
    jobDescription: string,
    resumeText: string,
    skills: string[]
  ): Promise<Result<ScoreResult, AppError>> {
    try {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return err(
          new AppError(
            "EXTERNAL_API_ERROR",
            "ANTHROPIC_API_KEY environment variable is not configured. Please set ANTHROPIC_API_KEY in .env file."
          )
        );
      }

      const anthropic = createAnthropic({ apiKey });
      const prompt = buildScoringPrompt(
        jobTitle,
        jobDescription,
        resumeText,
        skills
      );

      const { object } = await generateObject({
        model: anthropic("claude-3-5-sonnet-latest"),
        schema: scoreResultSchema,
        prompt,
      });

      return ok(object);
    } catch (E) {
      console.error(E);
      const message = E instanceof Error ? E.message : "Unknown error";
      return err(
        new AppError(
          "EXTERNAL_API_ERROR",
          `Claude scoring failed: ${message}`
        )
      );
    }
  }
}
