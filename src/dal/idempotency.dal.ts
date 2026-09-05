import "server-only";

import { db } from "@/services/db";
import { idempotencyKey, IdempotencyKeySelect } from "@/services/db/schema";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";
import { eq, and } from "drizzle-orm";

export type BeginIdempotencyResult =
  | { type: "locked"; record: IdempotencyKeySelect; attemptId: string }
  | { type: "completed"; record: IdempotencyKeySelect }
  | { type: "in_progress"; record: IdempotencyKeySelect };

export async function beginIdempotentAction(
  userId: string,
  action: string,
  key: string,
  targetId?: string | null
): Promise<Result<BeginIdempotencyResult, AppError>> {
  try {
    const initialAttemptId = crypto.randomUUID();

    // Attempt inserting in_progress
    const [inserted] = await db
      .insert(idempotencyKey)
      .values({
        userId,
        action,
        key,
        status: "in_progress",
        targetId: targetId || null,
        attemptId: initialAttemptId,
      })
      .onConflictDoNothing()
      .returning();

    if (inserted) {
      return ok({ type: "locked", record: inserted, attemptId: inserted.attemptId });
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
          targetId: targetId || null,
          attemptId: initialAttemptId,
        })
        .returning();
      return ok({ type: "locked", record: reinserted, attemptId: reinserted.attemptId });
    }

    if (existing.status === "completed") {
      return ok({ type: "completed", record: existing });
    }

    if (existing.status === "failed") {
      // Safe retry: allow reclaiming a failed attempt with the same key
      const nextAttemptId = crypto.randomUUID();
      const [updated] = await db
        .update(idempotencyKey)
        .set({
          status: "in_progress",
          targetId: targetId || existing.targetId,
          attemptId: nextAttemptId,
          createdAt: new Date(),
        })
        .where(
          and(
            eq(idempotencyKey.id, existing.id),
            eq(idempotencyKey.status, "failed"),
            eq(idempotencyKey.attemptId, existing.attemptId)
          )
        )
        .returning();

      if (!updated) {
        // Lost race to another concurrent reclaim or status change
        return ok({ type: "in_progress", record: existing });
      }
      return ok({ type: "locked", record: updated, attemptId: nextAttemptId });
    }

    // Status is "in_progress". Check for stale lock timeout (> 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (existing.createdAt < fiveMinutesAgo) {
      // Lock expired from crashed process/hung request, re-lock
      const nextAttemptId = crypto.randomUUID();
      const [reclaimed] = await db
        .update(idempotencyKey)
        .set({
          status: "in_progress",
          attemptId: nextAttemptId,
          createdAt: new Date(),
        })
        .where(
          and(
            eq(idempotencyKey.id, existing.id),
            eq(idempotencyKey.status, "in_progress"),
            eq(idempotencyKey.attemptId, existing.attemptId)
          )
        )
        .returning();

      if (!reclaimed) {
        // Lost race to another concurrent reclaim
        return ok({ type: "in_progress", record: existing });
      }
      return ok({ type: "locked", record: reclaimed, attemptId: nextAttemptId });
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
  attemptId: string,
  resultRef?: string | null
): Promise<Result<IdempotencyKeySelect, AppError>> {
  try {
    const [updated] = await db
      .update(idempotencyKey)
      .set({
        status: "completed",
        resultRef: resultRef || null,
      })
      .where(
        and(
          eq(idempotencyKey.id, id),
          eq(idempotencyKey.status, "in_progress"),
          eq(idempotencyKey.attemptId, attemptId)
        )
      )
      .returning();

    if (!updated) {
      return err(
        new AppError(
          "CONFLICT",
          `Idempotency record ${id} lost ownership or is not in_progress for attempt ${attemptId}`
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
  id: string,
  attemptId: string
): Promise<Result<IdempotencyKeySelect, AppError>> {
  try {
    const [updated] = await db
      .update(idempotencyKey)
      .set({
        status: "failed",
      })
      .where(
        and(
          eq(idempotencyKey.id, id),
          eq(idempotencyKey.status, "in_progress"),
          eq(idempotencyKey.attemptId, attemptId)
        )
      )
      .returning();

    if (!updated) {
      return err(
        new AppError(
          "CONFLICT",
          `Idempotency record ${id} lost ownership or is not in_progress for attempt ${attemptId}`
        )
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
