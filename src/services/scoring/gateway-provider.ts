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
import { gateway } from "@ai-sdk/gateway";

export class GatewayProvider implements ScoringProvider {
  name: AIProviderName = "gateway";

  async scoreJob(
    jobTitle: string,
    jobDescription: string,
    resumeText: string,
    skills: string[]
  ): Promise<Result<ScoreResult, AppError>> {
    try {
      const modelName = process.env.AI_GATEWAY_MODEL || "openai/gpt-4o";
      const model = gateway(modelName);

      const prompt = buildScoringPrompt(
        jobTitle,
        jobDescription,
        resumeText,
        skills
      );

      const { object } = await generateObject({
        model,
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
          `AI Gateway scoring failed: ${message}`
        )
      );
    }
  }
}
