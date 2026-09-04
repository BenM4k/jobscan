import "server-only";
import {
  ScoringProvider,
  ScoreWithUsage,
  ScoreUsage,
  AIProviderName,
  scoreResultSchema,
  SCORING_INSTRUCTIONS,
  buildScoringUserPrompt,
} from "./types";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";
import { generateText, Output } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

export class OpenAIProvider implements ScoringProvider {
  name: AIProviderName = "openai";

  async scoreJob(
    jobTitle: string,
    jobDescription: string,
    resumeText: string,
    skills: string[]
  ): Promise<Result<ScoreWithUsage, AppError>> {
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
      const userPrompt = buildScoringUserPrompt(
        jobTitle,
        jobDescription,
        resumeText,
        skills
      );

      const result = await generateText({
        model: openai("gpt-4o"),
        output: Output.object({ schema: scoreResultSchema }),
        system: SCORING_INSTRUCTIONS,
        prompt: userPrompt,
      });

      const usage: ScoreUsage = {
        inputTokens: result.usage?.inputTokens,
        outputTokens: result.usage?.outputTokens,
        modelId: "gpt-4o",
      };

      return ok({ ...result.output, _usage: usage });
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
