import "server-only";
import { embed } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";
import { setJobEmbedding } from "@/dal/jobs/mutations";
import { setResumeEmbedding } from "@/dal/resume.dal";

/**
 * Primary embedding model: gemini-embedding-2 (multimodal preview model with 8,192-token context).
 * Output dimensionality configured to 1536 to match vector(1536) columns in PostgreSQL pgvector.
 */
export const GEMINI_EMBEDDING_MODEL_ID = "gemini-embedding-2" as const;
export const EMBEDDING_DIMENSIONS = 1536;

/**
 * Generous ~24,000 char input truncation limit (approx 6,000-8,000 tokens),
 * calibrated to gemini-embedding-2's 8,192-token window.
 */
export const MAX_INPUT_CHARS = 24_000;

/**
 * Generate a 1536-dimensional embedding using Google Gemini (gemini-embedding-2) via Vercel AI SDK.
 * Returns err() — never throws — allowing callers to treat embeddings as
 * best-effort background enhancements without blocking main write paths.
 */
export async function embedText(
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

    // Truncate to MAX_INPUT_CHARS (24,000 chars) for gemini-embedding-2 context window
    const truncated =
      trimmed.length > MAX_INPUT_CHARS
        ? trimmed.slice(0, MAX_INPUT_CHARS)
        : trimmed;

    const geminiKey =
      process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!geminiKey) {
      return err(
        new AppError(
          "EXTERNAL_API_ERROR",
          "GEMINI_API_KEY is not configured — skipping embedding generation.",
        ),
      );
    }

    const google = createGoogleGenerativeAI({ apiKey: geminiKey });
    const model = google.textEmbeddingModel(GEMINI_EMBEDDING_MODEL_ID);

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
      new AppError("EXTERNAL_API_ERROR", "Failed to generate embedding", error),
    );
  }
}

/** Backward-compatible alias for embedText */
export const generateEmbedding = embedText;

/**
 * Convenience helper to generate embedding and persist to master_resume.embedding.
 * Can be run fire-and-forget on resume create/update.
 */
export async function embedResume(
  resumeId: string,
  userId: string,
  content: string,
): Promise<Result<void, AppError>> {
  const embRes = await embedText(content);
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
 * Convenience helper to format job text (title + "\n\n" + description),
 * generate embedding, and persist to job.embedding.
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
  const jobText = `${jobData.title}\n\n${jobData.description}`;
  const embRes = await embedText(jobText);
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
