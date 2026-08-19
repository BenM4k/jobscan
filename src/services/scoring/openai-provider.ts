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
import { createOpenAI } from "@ai-sdk/openai";

export class OpenAIProvider implements ScoringProvider {
  name: AIProviderName = "openai";

  async scoreJob(
    jobTitle: string,
    jobDescription: string,
    resumeText: string,
    skills: string[]
  ): Promise<Result<ScoreResult, AppError>> {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return err(
          new AppError(
            "EXTERNAL_API_ERROR",
            "OPENAI_API_KEY environment variable is not configured. Please set OPENAI_API_KEY in .env file."
          )
        );
      }

      const openai = createOpenAI({ apiKey });
      const prompt = buildScoringPrompt(
        jobTitle,
        jobDescription,
        resumeText,
        skills
      );

      const { object } = await generateObject({
        model: openai("gpt-4o"),
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
          `OpenAI scoring failed: ${message}`
        )
      );
    }
  }
}
