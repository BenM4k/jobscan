"use server";

import { requireSession } from "@/lib/auth-guard";
import { z } from "zod";
import { checkAiRateLimit } from "@/services/rate-limit";
import { runWithIdempotency } from "@/services/idempotency.service";
import { generateInterviewQuestions } from "@/services/interview.service";
import * as interviewDal from "@/dal/interview.dal";
import { spendCredits, grantCredits } from "@/services/billing/billing.service";
import { ok, err } from "@/lib/result";
import { AppError } from "@/lib/errors";

const interviewActionSchema = z.object({
  jobId: z.string().uuid("Invalid job ID"),
  pipelineEntryId: z.string().uuid("Invalid pipeline entry ID"),
  idempotencyKey: z.string().uuid("Invalid idempotency key"),
  resumeId: z.string().uuid().optional(),
});

/** Generates a billed, idempotent interview-question set for a pipeline entry. */
export async function generateInterviewQuestionsAction(data: {
  jobId: string;
  pipelineEntryId: string;
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

  // 1. Rate limit check
  const rateLimitRes = await checkAiRateLimit(userId, "interview_prep");
  if (!rateLimitRes.allowed) {
    return {
      success: false,
      code: "rate_limited",
      retryAfterSeconds: rateLimitRes.retryAfterSeconds,
      error: `Rate limit exceeded. Please wait ${rateLimitRes.retryAfterSeconds}s.`,
    };
  }

  // 2. Idempotent execution
  const result = await runWithIdempotency({
    userId,
    action: "interview_prep",
    key: parsed.data.idempotencyKey,
    targetId: parsed.data.pipelineEntryId,
    execute: async () => {
      // 3. Spend credits before AI call
      const spendRes = await spendCredits(userId, "interview_prep", parsed.data.pipelineEntryId);
      if (!spendRes.ok) return err(spendRes.error);

      const genRes = await generateInterviewQuestions(
        parsed.data.jobId,
        userId,
        parsed.data.pipelineEntryId,
        parsed.data.resumeId
      );

      if (!genRes.ok) {
        if (spendRes.value.cost > 0) {
          await grantCredits(userId, spendRes.value.cost, "refund", parsed.data.pipelineEntryId);
        }
        return genRes;
      }

      return ok({
        data: genRes.value,
        resultRef: genRes.value.id,
      });
    },
    resolveExisting: async (record) => {
      const entryId = record.targetId || parsed.data.pipelineEntryId;
      const existing = await interviewDal.getInterviewQuestionSetByEntryId(entryId);
      if (!existing.ok || !existing.value) {
        return err(new AppError("NOT_FOUND", "Existing interview questions not found"));
      }
      return ok(existing.value);
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

  return {
    success: true,
    data: result.value.data,
    isCached: result.value.isCached,
  };
}
