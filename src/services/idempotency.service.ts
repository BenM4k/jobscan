import "server-only";

import { z } from "zod";
import * as idempotencyDal from "@/dal/idempotency.dal";
import { IdempotencyKeySelect } from "@/services/db/schema";
export type { IdempotencyKeySelect };
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";

export const uuidKeySchema = z.uuid({
  message: "Idempotency key must be a valid UUID",
});

export interface IdempotencyDal {
  beginIdempotentAction: typeof idempotencyDal.beginIdempotentAction;
  completeIdempotentAction: typeof idempotencyDal.completeIdempotentAction;
  failIdempotentAction: typeof idempotencyDal.failIdempotentAction;
}

export interface RunWithIdempotencyOptions<T> {
  userId: string;
  action:
    | "run_scoring"
    | "generate_tailored_resume"
    | "generate_tailored_cover_letter"
    | string;
  key: string | null | undefined;
  targetId?: string | null;
  execute: () => Promise<
    Result<{ data: T; resultRef?: string | null }, AppError>
  >;
  resolveExisting: (
    record: IdempotencyKeySelect,
  ) => Promise<Result<T, AppError>>;
  dal?: Partial<IdempotencyDal>;
}

export type RunWithIdempotencyResult<T> = {
  data: T;
  isCached: boolean;
};

/**
 * Orchestrates action-level idempotency for paid AI mutations according to AGENTS.md §5 & §13.
 *
 * 1. Validates the client-minted UUID key.
 * 2. Attempts atomic insert in_progress via DAL with targetId tracking.
 * 3. If duplicate completed, verifies target match and resolves existing entity without calling AI.
 * 4. If in-progress, returns early with OPERATION_IN_PROGRESS.
 * 5. Executes AI mutation, marks completed with resultRef on success, or marks failed on error.
 */
export async function runWithIdempotency<T>({
  userId,
  action,
  key,
  targetId,
  execute,
  resolveExisting,
  dal,
}: RunWithIdempotencyOptions<T>): Promise<
  Result<RunWithIdempotencyResult<T>, AppError>
> {
  const beginAction = dal?.beginIdempotentAction ?? idempotencyDal.beginIdempotentAction;
  const completeAction = dal?.completeIdempotentAction ?? idempotencyDal.completeIdempotentAction;
  const failAction = dal?.failIdempotentAction ?? idempotencyDal.failIdempotentAction;

  if (!key) {
    return err(
      new AppError(
        "MISSING_IDEMPOTENCY_KEY",
        `Idempotency key is required for ${action}.`,
      ),
    );
  }

  const parsedKey = uuidKeySchema.safeParse(key);
  if (!parsedKey.success) {
    return err(
      new AppError(
        "INVALID_IDEMPOTENCY_KEY",
        parsedKey.error.issues[0]?.message || "Invalid idempotency key UUID",
      ),
    );
  }

  const validKey = parsedKey.data;
  const beginRes = await beginAction(
    userId,
    action,
    validKey,
    targetId,
  );

  if (!beginRes.ok) {
    return err(beginRes.error);
  }

  const state = beginRes.value;

  // 1. If duplicate is already completed, verify target match and return existing stored result
  if (state.type === "completed") {
    if (state.record.targetId && targetId && state.record.targetId !== targetId) {
      return err(
        new AppError(
          "CONFLICT",
          `Idempotency key ${validKey} was already completed for target ${state.record.targetId}, cannot reuse for ${targetId}`
        )
      );
    }

    const existingRes = await resolveExisting(state.record);
    if (existingRes.ok) {
      return ok({ data: existingRes.value, isCached: true });
    }

    // If resolving existing record failed, return error without starting another paid action
    return err(
      new AppError(
        "NOT_FOUND",
        `Completed operation for ${action}:${validKey} could not be resolved from cache: ${existingRes.error.message}`,
        existingRes.error,
      )
    );
  }

  // 2. If already in progress by a concurrent request, reject duplicate AI call
  if (state.type === "in_progress") {
    return err(
      new AppError(
        "OPERATION_IN_PROGRESS",
        `An operation for ${action} is currently in progress. Please wait.`,
      ),
    );
  }

  // 3. Locked — execute mutation
  try {
    const result = await execute();

    if (!result.ok) {
      await failAction(state.record.id, state.attemptId);
      return err(result.error);
    }

    const completeRes = await completeAction(
      state.record.id,
      state.attemptId,
      result.value.resultRef,
    );
    if (!completeRes.ok) {
      console.warn(`[Idempotency] Failed to complete action due to lost lease or conflict:`, completeRes.error);
      return err(completeRes.error);
    }

    return ok({ data: result.value.data, isCached: false });
  } catch (error) {
    await failAction(state.record.id, state.attemptId);
    return err(
      new AppError(
        "AI_EXECUTION_ERROR",
        `Failed executing ${action} under idempotency`,
        error,
      ),
    );
  }
}
