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
import { gateway } from "@ai-sdk/gateway";

export class GatewayProvider implements ScoringProvider {
  name: AIProviderName = "gateway";

  async scoreJob(
    jobTitle: string,
    jobDescription: string,
    resumeText: string,
    skills: string[]
  ): Promise<Result<ScoreWithUsage, AppError>> {
    try {
      const modelName = process.env.AI_GATEWAY_MODEL || "openai/gpt-4o";
      const model = gateway(modelName);

      const userPrompt = buildScoringUserPrompt(
        jobTitle,
        jobDescription,
        resumeText,
        skills
      );

      const result = await generateText({
        model,
        output: Output.object({ schema: scoreResultSchema }),
        system: SCORING_INSTRUCTIONS,
        prompt: userPrompt,
      });

      const usage: ScoreUsage = {
        inputTokens: result.usage?.inputTokens,
        outputTokens: result.usage?.outputTokens,
        modelId: modelName,
      };

      return ok({ ...result.output, _usage: usage });
    } catch (E) {
      console.error(E);
      const message = E instanceof Error ? E.message : "Unknown error";
      return err(
        new AppError(
          "EXTERNAL_API_ERROR",
          `AI Gateway scoring failed: ${message}`
        )
      );
    }
  }
}
