import "server-only";
import { embed } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";

/**
 * Embedding model: gemini-embedding-001 truncated to 1536 dims to match the
 * vector(1536) column in master_resume and job tables.
 *
 * gemini-embedding-001 natively outputs 3072 dims; outputDimensionality
 * truncates it via Matryoshka Representation Learning, preserving quality.
 */
const EMBEDDING_MODEL_ID = "gemini-embedding-001" as const;
const EMBEDDING_DIMENSIONS = 1536;

/**
 * Generate a 1536-dimensional embedding for the given text.
 * Returns err() — never throws — so callers can treat embeddings as
 * best-effort enhancements without blocking the main write path.
 */
export async function generateEmbedding(
  text: string
): Promise<Result<number[], AppError>> {
  try {
    const apiKey =
      process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
      return err(
        new AppError(
          "EXTERNAL_API_ERROR",
          "GEMINI_API_KEY is not configured — skipping embedding generation."
        )
      );
    }

    const google = createGoogleGenerativeAI({ apiKey });
    const model = google.embedding(EMBEDDING_MODEL_ID);

    // Truncate very long texts to ~8k tokens (≈ 32k chars) before embedding
    const truncated = text.length > 32_000 ? text.slice(0, 32_000) : text;

    const { embedding } = await embed({
      model,
      value: truncated,
      providerOptions: {
        google: { outputDimensionality: EMBEDDING_DIMENSIONS },
      },
    });

    return ok(embedding);
  } catch (error) {
    return err(
      new AppError("EXTERNAL_API_ERROR", "Failed to generate embedding", error)
    );
  }
}
