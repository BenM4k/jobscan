"use server";

import { revalidateTags, BILLING_TAG, NAVBAR_TAG } from "@/lib/cache-tags";
import { requireSession } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";
import { err, ok } from "@/lib/result";
import { spendCredits, grantCredits } from "@/services/billing/billing.service";
import { cacheGet, cacheSetChecked } from "@/services/cache/redis-client";
import { inngest } from "@/inngest/client";
import { runWithIdempotency } from "@/services/idempotency.service";
import { extractJobFieldsWithAi } from "@/services/job-import/ai-job-extractor";
import { extractTextFromJobFile } from "@/services/job-import/file-extractor";
import { parseJobJson } from "@/services/job-import/json-parser";
import {
  detectSmartPasteType,
  type ExtractedJobResult,
  type JobExtractionMethod,
} from "@/services/job-import/schema";
import { fetchAndExtractJobUrl } from "@/services/job-import/url-extractor";
import { checkAiRateLimit } from "@/services/rate-limit";
import { z } from "zod";

const EXTRACTION_CACHE_TTL_SEC = 900;

const extractFromInputSchema = z.object({
  rawInput: z
    .string()
    .trim()
    .min(5, "Please paste a job URL, JSON, or description text.")
    .max(30_000, "Pasted content is too long (max 30,000 characters)."),
  idempotencyKey: z.uuid("A valid UUID idempotency key is required."),
});

const extractFromFileSchema = z.object({
  idempotencyKey: z.uuid("A valid UUID idempotency key is required."),
});

export interface JobImportCreditDetails {
  code?: string;
  shortfall?: number;
  currentBalance?: number;
  requiredCost?: number;
}

export type JobImportActionResponse =
  | { success: true; data: ExtractedJobResult }
  | {
      success: false;
      error: string;
      code?:
        | "rate_limited"
        | "insufficient_credits"
        | "url_fetch_failed"
        | "result_expired";
      retryAfterSeconds?: number;
      details?: JobImportCreditDetails;
    };

function getExtractionCacheKey(userId: string, idempotencyKey: string): string {
  return `job_extraction:${userId}:${idempotencyKey}`;
}

async function compensateCreditDebit(params: {
  userId: string;
  amount: number;
  idempotencyKey: string;
  reason: string;
}): Promise<void> {
  if (params.amount <= 0) return;

  const firstAttempt = await grantCredits(
    params.userId,
    params.amount,
    "refund",
    null
  );
  if (firstAttempt.ok) return;

  await new Promise((resolve) => setTimeout(resolve, 150));
  const retryAttempt = await grantCredits(
    params.userId,
    params.amount,
    "refund",
    null
  );
  if (retryAttempt.ok) return;

  try {
    await inngest.send({
      name: "billing.refund.retry",
      id: `refund:${params.userId}:${params.idempotencyKey}`,
      data: {
        userId: params.userId,
        amount: params.amount,
        reason: params.reason,
        idempotencyKey: params.idempotencyKey,
      },
    });
  } catch (err) {
    console.error(
      `[Billing] Failed to refund or enqueue refund retry for user=${params.userId} key=${params.idempotencyKey} amount=${params.amount}:`,
      firstAttempt.error.message,
      retryAttempt.error.message,
      err instanceof Error ? err.message : err
    );
  }
}

async function runCreditGatedAiExtraction(params: {
  userId: string;
  idempotencyKey: string;
  rawText: string;
  sourceUrl?: string;
  method: Extract<JobExtractionMethod, "ai_url" | "ai_text" | "ai_file">;
}): Promise<JobImportActionResponse> {
  const rateLimitRes = await checkAiRateLimit(params.userId, "job_extraction");
  if (!rateLimitRes.allowed) {
    return {
      success: false,
      code: "rate_limited",
      retryAfterSeconds: rateLimitRes.retryAfterSeconds,
      error: `Rate limit exceeded. Please wait ${rateLimitRes.retryAfterSeconds}s.`,
    };
  }

  const cacheKey = getExtractionCacheKey(params.userId, params.idempotencyKey);

  const idemResult = await runWithIdempotency<ExtractedJobResult>({
    userId: params.userId,
    action: "job_extraction",
    key: params.idempotencyKey,
    targetId: params.sourceUrl || params.method,
    execute: async () => {
      const spendRes = await spendCredits(
        params.userId,
        "job_extraction",
        null,
      );
      if (!spendRes.ok) {
        return err(spendRes.error);
      }

      const aiRes = await extractJobFieldsWithAi({
        userId: params.userId,
        rawText: params.rawText,
        sourceUrl: params.sourceUrl,
      });

      if (!aiRes.ok) {
        await compensateCreditDebit({
          userId: params.userId,
          amount: spendRes.value.cost,
          idempotencyKey: params.idempotencyKey,
          reason: aiRes.error.message,
        });
        revalidateTags([BILLING_TAG, NAVBAR_TAG]);
        return err(aiRes.error);
      }

      const payload: ExtractedJobResult = {
        fields: aiRes.value,
        method: params.method,
        creditsUsed: spendRes.value.cost,
      };

      const cachedOk = await cacheSetChecked(
        cacheKey,
        payload,
        EXTRACTION_CACHE_TTL_SEC
      );
      if (!cachedOk) {
        await compensateCreditDebit({
          userId: params.userId,
          amount: spendRes.value.cost,
          idempotencyKey: params.idempotencyKey,
          reason: "Extraction result storage unavailable",
        });
        revalidateTags([BILLING_TAG, NAVBAR_TAG]);
        return err(
          new AppError(
            "EXTERNAL_API_ERROR",
            "Temporary storage error prevented saving the extraction result. Any spent credit has been refunded — please try again."
          )
        );
      }

      revalidateTags([BILLING_TAG, NAVBAR_TAG]);

      return ok({ data: payload, resultRef: null });
    },
    resolveExisting: async () => {
      const cached = await cacheGet<ExtractedJobResult>(cacheKey);
      if (cached) {
        return ok(cached);
      }
      return err(
        new AppError(
          "NOT_FOUND",
          "Previous extraction result expired. Please click extract again.",
        ),
      );
    },
  });

  if (!idemResult.ok) {
    if (idemResult.error.code === "INSUFFICIENT_CREDITS") {
      return {
        success: false,
        code: "insufficient_credits",
        error: idemResult.error.message,
        details: (idemResult.error.details ?? {}) as JobImportCreditDetails,
      };
    }
    if (idemResult.error.code === "NOT_FOUND") {
      return {
        success: false,
        code: "result_expired",
        error: "Previous extraction result expired. Please click extract again.",
      };
    }
    return { success: false, error: idemResult.error.message };
  }

  return {
    success: true,
    data: idemResult.value.data,
  };
}

/**
 * Extracts job fields from a pasted URL, JSON payload, or raw job description text.
 * Deterministic JSON and schema.org/JobPosting URLs are free (0 credits).
 * Unstructured text and plain HTML pages use credit-gated AI extraction.
 */
export async function extractJobFromInputAction(input: {
  rawInput: string;
  idempotencyKey: string;
}): Promise<JobImportActionResponse> {
  const session = await requireSession();
  if (!session.ok || !session.value) {
    return {
      success: false,
      error: session.ok ? "Unauthorized" : session.error.message,
    };
  }

  const parsed = extractFromInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Invalid import input.",
    };
  }

  const userId = session.value.user.id;
  const { rawInput, idempotencyKey } = parsed.data;
  const kind = detectSmartPasteType(rawInput);

  if (kind === "json") {
    const jsonRes = parseJobJson(rawInput);
    if (!jsonRes.ok) {
      return { success: false, error: jsonRes.error.message };
    }
    return {
      success: true,
      data: {
        fields: jsonRes.value,
        method: "json",
        creditsUsed: 0,
      },
    };
  }

  if (kind === "url") {
    const urlRateLimit = await checkAiRateLimit(userId, "job_url_fetch", {
      capacity: 15,
      refillRatePerSec: 0.25,
    });
    if (!urlRateLimit.allowed) {
      return {
        success: false,
        code: "rate_limited",
        retryAfterSeconds: urlRateLimit.retryAfterSeconds,
        error: `Rate limit exceeded. Please wait ${urlRateLimit.retryAfterSeconds}s.`,
      };
    }

    const urlRes = await fetchAndExtractJobUrl(rawInput);
    if (!urlRes.ok) {
      return {
        success: false,
        code:
          urlRes.error.code === "EXTERNAL_API_ERROR"
            ? "url_fetch_failed"
            : undefined,
        error: urlRes.error.message,
      };
    }

    if (urlRes.value.structured) {
      return {
        success: true,
        data: {
          fields: urlRes.value.structured,
          method: "url_structured",
          creditsUsed: 0,
        },
      };
    }

    return await runCreditGatedAiExtraction({
      userId,
      idempotencyKey,
      rawText: urlRes.value.plainText,
      sourceUrl: urlRes.value.finalUrl,
      method: "ai_url",
    });
  }

  return await runCreditGatedAiExtraction({
    userId,
    idempotencyKey,
    rawText: rawInput,
    method: "ai_text",
  });
}

/**
 * Extracts job fields from an uploaded PDF, DOCX, or TXT file using credit-gated AI parsing.
 * Document text extraction happens prior to billing so corrupt/empty files never cost credits.
 */
export async function extractJobFromFileAction(
  formData: FormData,
): Promise<JobImportActionResponse> {
  const session = await requireSession();
  if (!session.ok || !session.value) {
    return {
      success: false,
      error: session.ok ? "Unauthorized" : session.error.message,
    };
  }

  if (!(formData instanceof FormData)) {
    return {
      success: false,
      error: "Invalid file upload payload.",
    };
  }

  const parsedMeta = extractFromFileSchema.safeParse({
    idempotencyKey: formData.get("idempotencyKey"),
  });
  if (!parsedMeta.success) {
    return {
      success: false,
      error: parsedMeta.error.issues[0]?.message || "Invalid request metadata.",
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { success: false, error: "Please select a job document file." };
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const extractedTextRes = await extractTextFromJobFile(
    fileBuffer,
    file.type,
    file.name,
  );

  if (!extractedTextRes.ok) {
    return { success: false, error: extractedTextRes.error.message };
  }

  return await runCreditGatedAiExtraction({
    userId: session.value.user.id,
    idempotencyKey: parsedMeta.data.idempotencyKey,
    rawText: extractedTextRes.value,
    method: "ai_file",
  });
}
