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
 * 2. Attempts atomic insert in_progress via DAL.
 * 3. If duplicate completed, resolves existing entity without calling AI.
 * 4. If in-progress, returns early with OPERATION_IN_PROGRESS.
 * 5. Executes AI mutation, marks completed with resultRef on success, or marks failed on error.
 */
export async function runWithIdempotency<T>({
  userId,
  action,
  key,
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
  );

  if (!beginRes.ok) {
    return err(beginRes.error);
  }

  const state = beginRes.value;

  // 1. If duplicate is already completed, return existing stored result
  if (state.type === "completed") {
    const existingRes = await resolveExisting(state.record);
    if (existingRes.ok) {
      return ok({ data: existingRes.value, isCached: true });
    }
    // If resolving existing record failed (e.g. deleted entity), log and fall through to re-execute
    console.warn(
      `[Idempotency] Failed to resolve completed result for ${action}:${validKey}, re-executing:`,
      existingRes.error,
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
      await failAction(state.record.id);
      return err(result.error);
    }

    await completeAction(
      state.record.id,
      result.value.resultRef,
    );

    return ok({ data: result.value.data, isCached: false });
  } catch (error) {
    await failAction(state.record.id);
    return err(
      new AppError(
        "AI_EXECUTION_ERROR",
        `Failed executing ${action} under idempotency`,
        error,
      ),
    );
  }
}
