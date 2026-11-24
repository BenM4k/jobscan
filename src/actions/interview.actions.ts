"use server";

import { requireSession } from "@/lib/auth-guard";
import { z } from "zod";
import { checkAiRateLimit } from "@/services/rate-limit";
import { runWithIdempotency } from "@/services/idempotency.service";
import {
  generateInterviewQuestions,
  getInterviewQuestionsForEntry,
  resolveInterviewPipelineEntry,
} from "@/services/interview.service";
import { spendCredits, grantCredits } from "@/services/billing/billing.service";
import { ok, err } from "@/lib/result";
import { AppError } from "@/lib/errors";
import {
  BILLING_TAG,
  DASHBOARD_FEED_TAG,
  NAVBAR_TAG,
  jobTag,
  revalidateTags,
} from "@/lib/cache-tags";

const interviewActionSchema = z.object({
  jobId: z.string().uuid("Invalid job ID"),
  pipelineEntryId: z.string().uuid("Invalid pipeline entry ID").optional(),
  idempotencyKey: z.string().uuid("Invalid idempotency key"),
  resumeId: z.string().uuid().optional(),
});

/** Generates a billed, idempotent interview-question set for a job/pipeline entry. */
export async function generateInterviewQuestionsAction(data: {
  jobId: string;
  pipelineEntryId?: string;
  idempotencyKey: string;
  resumeId?: string;
}) {
  const session = await requireSession();
  if (!session.ok || !session.value) {
    return { success: false, error: session.ok ? "Unauthorized" : session.error.message };
  }

  const parsed = interviewActionSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid arguments" };
  }

  const userId = session.value.user.id;

  const entryRes = await resolveInterviewPipelineEntry(
    userId,
    parsed.data.jobId,
    parsed.data.pipelineEntryId
  );
  if (!entryRes.ok) {
    return { success: false, error: entryRes.error.message };
  }

  const { pipelineEntryId, canonicalJobId } = entryRes.value;

  const rateLimitRes = await checkAiRateLimit(userId, "interview_prep");
  if (!rateLimitRes.allowed) {
    return {
      success: false,
      code: "rate_limited",
      retryAfterSeconds: rateLimitRes.retryAfterSeconds,
      error: `Rate limit exceeded. Please wait ${rateLimitRes.retryAfterSeconds}s.`,
    };
  }

  const result = await runWithIdempotency({
    userId,
    action: "interview_prep",
    key: parsed.data.idempotencyKey,
    targetId: pipelineEntryId,
    execute: async () => {
      const spendRes = await spendCredits(userId, "interview_prep", pipelineEntryId);
      if (!spendRes.ok) return err(spendRes.error);

      const genRes = await generateInterviewQuestions(
        canonicalJobId,
        userId,
        pipelineEntryId,
        parsed.data.resumeId
      );

      if (!genRes.ok) {
        if (spendRes.value.cost > 0) {
          await grantCredits(userId, spendRes.value.cost, "refund", pipelineEntryId);
          revalidateTags([BILLING_TAG, NAVBAR_TAG]);
        }
        return genRes;
      }

      return ok({
        data: { ...genRes.value, pipelineEntryId },
        resultRef: genRes.value.id,
      });
    },
    resolveExisting: async (record) => {
      const targetEntryId = record.targetId || pipelineEntryId;
      const existing = await getInterviewQuestionsForEntry(targetEntryId, userId);
      if (!existing.ok || !existing.value) {
        return err(new AppError("NOT_FOUND", "Existing interview questions not found"));
      }
      return ok({ ...existing.value, pipelineEntryId: targetEntryId });
    },
  });

  if (!result.ok) {
    if (result.error.code === "INSUFFICIENT_CREDITS") {
      return {
        success: false,
        code: "insufficient_credits",
        error: result.error.message,
        details: result.error.details,
      };
    }
    return { success: false, error: result.error.message };
  }

  revalidateTags([
    BILLING_TAG,
    NAVBAR_TAG,
    DASHBOARD_FEED_TAG,
    jobTag(canonicalJobId),
    jobTag(pipelineEntryId),
  ]);

  return {
    success: true,
    data: result.value.data,
    isCached: result.value.isCached,
  };
}
