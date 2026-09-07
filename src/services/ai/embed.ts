import "server-only";
import { embed } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";
import { setJobEmbedding } from "@/dal/jobs/mutations";
import { setResumeEmbedding } from "@/dal/resume.dal";

/**
 * Embedding models configured for 1536 dimensions to match the
 * vector(1536) column in master_resume and job tables.
 */
const GEMINI_EMBEDDING_MODEL_ID = "gemini-embedding-2" as const;
const OPENAI_EMBEDDING_MODEL_ID = "text-embedding-3-small" as const;
const EMBEDDING_DIMENSIONS = 1536;

/**
 * Generate a 1536-dimensional embedding for the given text using Vercel AI SDK.
 * Returns err() — never throws — so callers can treat embeddings as
 * best-effort enhancements without blocking the main write path.
 */
export async function generateEmbedding(
  text: string,
): Promise<Result<number[], AppError>> {
  try {
    const trimmed = text.trim();
    if (!trimmed) {
      return err(
        new AppError(
          "VALIDATION_ERROR",
          "Cannot generate embedding for empty text",
        ),
      );
    }

    // Truncate very long texts to ~8k tokens (≈ 32k chars) before embedding
    const truncated =
      trimmed.length > 32_000 ? trimmed.slice(0, 32_000) : trimmed;

    const geminiKey =
      process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (geminiKey) {
      const google = createGoogleGenerativeAI({ apiKey: geminiKey });
      const model = google.embedding(GEMINI_EMBEDDING_MODEL_ID);

      const { embedding } = await embed({
        model,
        value: truncated,
        providerOptions: {
          google: { outputDimensionality: EMBEDDING_DIMENSIONS },
        },
      });

      return ok(embedding);
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      const openai = createOpenAI({ apiKey: openaiKey });
      const model = openai.embedding(OPENAI_EMBEDDING_MODEL_ID);

      const { embedding } = await embed({
        model,
        value: truncated,
      });

      return ok(embedding);
    }

    return err(
      new AppError(
        "EXTERNAL_API_ERROR",
        "Neither GEMINI_API_KEY nor OPENAI_API_KEY is configured — skipping embedding generation.",
      ),
    );
  } catch (error) {
    return err(
      new AppError("EXTERNAL_API_ERROR", "Failed to generate embedding", error),
    );
  }
}

/** Alias for generateEmbedding */
export const embedText = generateEmbedding;

/**
 * Convenience helper to build text, generate embedding, and persist to master_resume.embedding.
 * Can be run fire-and-forget.
 */
export async function embedResume(
  resumeId: string,
  userId: string,
  content: string,
): Promise<Result<void, AppError>> {
  const embRes = await generateEmbedding(content);
  if (!embRes.ok) {
    console.warn(
      `Resume embedding generation failed for resume ${resumeId}:`,
      embRes.error.message,
    );
    return embRes;
  }

  const setRes = await setResumeEmbedding(resumeId, userId, embRes.value);
  if (!setRes.ok) {
    console.warn(
      `Resume embedding storage failed for resume ${resumeId}:`,
      setRes.error.message,
    );
    return setRes;
  }

  return ok(undefined);
}

/**
 * Convenience helper to format job text, generate embedding, and persist to job.embedding.
 * Can be run fire-and-forget right after job normalization.
 */
export async function embedJob(
  jobId: string,
  jobData: {
    title: string;
    company?: string | null;
    description: string;
  },
): Promise<Result<void, AppError>> {
  const jobText = `${jobData.title} at ${jobData.company || "Company"}\n\n${jobData.description}`;
  const embRes = await generateEmbedding(jobText);
  if (!embRes.ok) {
    console.warn(
      `Job embedding generation failed for job ${jobId}:`,
      embRes.error.message,
    );
    return embRes;
  }

  const setRes = await setJobEmbedding(jobId, embRes.value);
  if (!setRes.ok) {
    console.warn(
      `Job embedding storage failed for job ${jobId}:`,
      setRes.error.message,
    );
    return setRes;
  }

  return ok(undefined);
}
