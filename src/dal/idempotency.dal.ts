if (typeof window !== "undefined") {
  throw new Error("This module can only be executed on the server.");
}

import { db } from "@/services/db";
import { idempotencyKey, IdempotencyKeySelect } from "@/services/db/schema";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";
import { eq, and } from "drizzle-orm";

export type BeginIdempotencyResult =
  | { type: "locked"; record: IdempotencyKeySelect }
  | { type: "completed"; record: IdempotencyKeySelect }
  | { type: "in_progress"; record: IdempotencyKeySelect };

export async function beginIdempotentAction(
  userId: string,
  action: string,
  key: string
): Promise<Result<BeginIdempotencyResult, AppError>> {
  try {
    // Attempt inserting in_progress
    const [inserted] = await db
      .insert(idempotencyKey)
      .values({
        userId,
        action,
        key,
        status: "in_progress",
      })
      .onConflictDoNothing()
      .returning();

    if (inserted) {
      return ok({ type: "locked", record: inserted });
    }

    // Insert conflicted on (userId, action, key) unique constraint
    const [existing] = await db
      .select()
      .from(idempotencyKey)
      .where(
        and(
          eq(idempotencyKey.userId, userId),
          eq(idempotencyKey.action, action),
          eq(idempotencyKey.key, key)
        )
      )
      .limit(1);

    if (!existing) {
      // Race condition where row was deleted right after conflict
      const [reinserted] = await db
        .insert(idempotencyKey)
        .values({
          userId,
          action,
          key,
          status: "in_progress",
        })
        .returning();
      return ok({ type: "locked", record: reinserted });
    }

    if (existing.status === "completed") {
      return ok({ type: "completed", record: existing });
    }

    if (existing.status === "failed") {
      // Safe retry: allow reclaiming a failed attempt with the same key
      const [updated] = await db
        .update(idempotencyKey)
        .set({
          status: "in_progress",
          createdAt: new Date(),
        })
        .where(eq(idempotencyKey.id, existing.id))
        .returning();
      return ok({ type: "locked", record: updated });
    }

    // Status is "in_progress". Check for stale lock timeout (> 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (existing.createdAt < fiveMinutesAgo) {
      // Lock expired from crashed process/hung request, re-lock
      const [reclaimed] = await db
        .update(idempotencyKey)
        .set({
          status: "in_progress",
          createdAt: new Date(),
        })
        .where(eq(idempotencyKey.id, existing.id))
        .returning();
      return ok({ type: "locked", record: reclaimed });
    }

    return ok({ type: "in_progress", record: existing });
  } catch (error) {
    return err(
      new AppError(
        "DB_ERROR",
        `Failed to begin idempotent action for ${action}:${key}`,
        error
      )
    );
  }
}

export async function completeIdempotentAction(
  id: string,
  resultRef?: string | null
): Promise<Result<IdempotencyKeySelect, AppError>> {
  try {
    const [updated] = await db
      .update(idempotencyKey)
      .set({
        status: "completed",
        resultRef: resultRef || null,
      })
      .where(eq(idempotencyKey.id, id))
      .returning();

    if (!updated) {
      return err(
        new AppError(
          "NOT_FOUND",
          `Idempotency record ${id} not found to complete`
        )
      );
    }

    return ok(updated);
  } catch (error) {
    return err(
      new AppError(
        "DB_ERROR",
        `Failed to complete idempotent action ${id}`,
        error
      )
    );
  }
}

export async function failIdempotentAction(
  id: string
): Promise<Result<IdempotencyKeySelect, AppError>> {
  try {
    const [updated] = await db
      .update(idempotencyKey)
      .set({
        status: "failed",
      })
      .where(eq(idempotencyKey.id, id))
      .returning();

    if (!updated) {
      return err(
        new AppError("NOT_FOUND", `Idempotency record ${id} not found to fail`)
      );
    }

    return ok(updated);
  } catch (error) {
    return err(
      new AppError(
        "DB_ERROR",
        `Failed to mark idempotent action ${id} as failed`,
        error
      )
    );
  }
}

export async function getIdempotencyRecord(
  userId: string,
  action: string,
  key: string
): Promise<Result<IdempotencyKeySelect | null, AppError>> {
  try {
    const [found] = await db
      .select()
      .from(idempotencyKey)
      .where(
        and(
          eq(idempotencyKey.userId, userId),
          eq(idempotencyKey.action, action),
          eq(idempotencyKey.key, key)
        )
      )
      .limit(1);

    return ok(found || null);
  } catch (error) {
    return err(
      new AppError(
        "DB_ERROR",
        `Failed to fetch idempotency record for ${action}:${key}`,
        error
      )
    );
  }
}
