import "server-only";
import {
  ScoringProvider,
  ScoreResult,
  AIProviderName,
  scoreResultSchema,
  SCORING_INSTRUCTIONS,
  buildScoringUserPrompt,
} from "./types";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";
import { generateText, Output } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { AI_MODEL } from "@/lib/ai";

export class GeminiProvider implements ScoringProvider {
  name: AIProviderName = "gemini";

  async scoreJob(
    jobTitle: string,
    jobDescription: string,
    resumeText: string,
    skills: string[],
  ): Promise<Result<ScoreResult, AppError>> {
    try {
      const apiKey =
        process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!apiKey) {
        return err(
          new AppError(
            "EXTERNAL_API_ERROR",
            "GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY environment variable is not configured.",
          ),
        );
      }

      const google = createGoogleGenerativeAI({ apiKey });
      const userPrompt = buildScoringUserPrompt(
        jobTitle,
        jobDescription,
        resumeText,
        skills,
      );

      const { output: object } = await generateText({
        model: google(AI_MODEL),
        output: Output.object({ schema: scoreResultSchema }),
        system: SCORING_INSTRUCTIONS,
        prompt: userPrompt,
      });

      return ok(object);
    } catch (E) {
      console.error(E);
      const message = E instanceof Error ? E.message : "Unknown error";
      return err(
        new AppError("EXTERNAL_API_ERROR", `Gemini scoring failed: ${message}`),
      );
    }
  }
}
