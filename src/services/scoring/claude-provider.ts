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
import { createAnthropic } from "@ai-sdk/anthropic";

export class ClaudeProvider implements ScoringProvider {
  name: AIProviderName = "claude";
  modelId: string;

  constructor(modelId?: string) {
    this.modelId =
      modelId?.trim() ||
      process.env.ANTHROPIC_MODEL?.trim() ||
      "claude-3-5-sonnet-latest";
  }

  async scoreJob(
    jobTitle: string,
    jobDescription: string,
    resumeText: string,
    skills: string[]
  ): Promise<Result<ScoreWithUsage, AppError>> {
    try {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return err(
          new AppError(
            "EXTERNAL_API_ERROR",
            "AI scoring service is currently unavailable. Please try again later."
          )
        );
      }

      const anthropic = createAnthropic({ apiKey });
      const userPrompt = buildScoringUserPrompt(
        jobTitle,
        jobDescription,
        resumeText,
        skills
      );

      const result = await generateText({
        model: anthropic(this.modelId),
        output: Output.object({ schema: scoreResultSchema }),
        system: SCORING_INSTRUCTIONS,
        prompt: userPrompt,
      });

      const usage: ScoreUsage = {
        inputTokens: result.usage?.inputTokens,
        outputTokens: result.usage?.outputTokens,
        modelId: this.modelId,
      };

      return ok({ ...result.output, _usage: usage });
    } catch (E) {
      console.error(E);
      const message = E instanceof Error ? E.message : "Unknown error";
      return err(
        new AppError("EXTERNAL_API_ERROR", `AI scoring failed: ${message}`)
      );
    }
  }
}
