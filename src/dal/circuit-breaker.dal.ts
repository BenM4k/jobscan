import "server-only";

import { db } from "@/services/db";
import {
  adapterCircuitBreaker,
  AdapterCircuitBreakerSelect,
  AdapterCircuitBreakerInsert,
} from "@/services/db/schema";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";
import { eq } from "drizzle-orm";

export async function getCircuitBreaker(
  source: string
): Promise<Result<AdapterCircuitBreakerSelect | null, AppError>> {
  try {
    const [row] = await db
      .select()
      .from(adapterCircuitBreaker)
      .where(eq(adapterCircuitBreaker.source, source))
      .limit(1);

    return ok(row || null);
  } catch (error) {
    return err(
      new AppError(
        "DB_ERROR",
        `Failed to get circuit breaker for source ${source}`,
        error
      )
    );
  }
}

export async function upsertCircuitBreaker(
  data: AdapterCircuitBreakerInsert
): Promise<Result<AdapterCircuitBreakerSelect, AppError>> {
  try {
    const [row] = await db
      .insert(adapterCircuitBreaker)
      .values(data)
      .onConflictDoUpdate({
        target: [adapterCircuitBreaker.source],
        set: {
          state: data.state,
          consecutiveFailures: data.consecutiveFailures,
          consecutiveOpens: data.consecutiveOpens,
          openedAt: data.openedAt,
          updatedAt: new Date(),
        },
      })
      .returning();

    return ok(row);
  } catch (error) {
    return err(
      new AppError(
        "DB_ERROR",
        `Failed to upsert circuit breaker for source ${data.source}`,
        error
      )
    );
  }
}

export async function updateCircuitBreaker(
  source: string,
  data: Partial<AdapterCircuitBreakerInsert>
): Promise<Result<AdapterCircuitBreakerSelect, AppError>> {
  try {
    const [row] = await db
      .update(adapterCircuitBreaker)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(adapterCircuitBreaker.source, source))
      .returning();

    return ok(row);
  } catch (error) {
    return err(
      new AppError(
        "DB_ERROR",
        `Failed to update circuit breaker for source ${source}`,
        error
      )
    );
  }
}

export async function getAllCircuitBreakers(): Promise<
  Result<AdapterCircuitBreakerSelect[], AppError>
> {
  try {
    const rows = await db.select().from(adapterCircuitBreaker);
    return ok(rows);
  } catch (error) {
    return err(
      new AppError("DB_ERROR", "Failed to retrieve all circuit breakers", error)
    );
  }
}

/**
 * Atomically checks breaker state and claims a half-open probe if open backoff has elapsed.
 * Only the winning claimant transitions state to 'half_open' and receives allowed = true.
 * An existing 'half_open' state represents an in-progress probe and returns allowed = false.
 */
export async function claimHalfOpenProbe(
  source: string,
  backoffMs: number
): Promise<Result<{ allowed: boolean }, AppError>> {
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(adapterCircuitBreaker)
        .where(eq(adapterCircuitBreaker.source, source))
        .for("update")
        .limit(1);

      if (!row) {
        await tx.insert(adapterCircuitBreaker).values({
          source,
          state: "closed",
          consecutiveFailures: 0,
          consecutiveOpens: 0,
          openedAt: null,
        });
        return ok({ allowed: true });
      }

      if (row.state === "closed") {
        return ok({ allowed: true });
      }

      if (row.state === "half_open") {
        return ok({ allowed: false });
      }

      if (row.state === "open") {
        if (!row.openedAt) {
          await tx
            .update(adapterCircuitBreaker)
            .set({ state: "half_open", updatedAt: new Date() })
            .where(eq(adapterCircuitBreaker.source, source));
          return ok({ allowed: true });
        }

        const elapsed = Date.now() - row.openedAt.getTime();
        if (elapsed >= backoffMs) {
          await tx
            .update(adapterCircuitBreaker)
            .set({ state: "half_open", updatedAt: new Date() })
            .where(eq(adapterCircuitBreaker.source, source));
          return ok({ allowed: true });
        }

        return ok({ allowed: false });
      }

      return ok({ allowed: true });
    });
  } catch (error) {
    return err(
      new AppError(
        "DB_ERROR",
        `Failed to claim half-open probe for source ${source}`,
        error
      )
    );
  }
}

/**
 * Atomically increments consecutive failures, evaluates FAILURE_THRESHOLD / half_open,
 * and transitions to OPEN state when threshold is reached, all within a single transaction.
 */
export async function recordFailureAtomic(
  source: string,
  threshold: number = 5
): Promise<Result<AdapterCircuitBreakerSelect, AppError>> {
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(adapterCircuitBreaker)
        .where(eq(adapterCircuitBreaker.source, source))
        .for("update")
        .limit(1);

      if (!row) {
        const [inserted] = await tx
          .insert(adapterCircuitBreaker)
          .values({
            source,
            state: threshold <= 1 ? "open" : "closed",
            consecutiveFailures: 1,
            consecutiveOpens: 0,
            openedAt: threshold <= 1 ? new Date() : null,
          })
          .returning();
        return ok(inserted);
      }

      const nextFailures = row.consecutiveFailures + 1;
      const isHalfOpen = row.state === "half_open";
      const shouldTrip = isHalfOpen || nextFailures >= threshold;

      const nextOpens = shouldTrip
        ? isHalfOpen
          ? row.consecutiveOpens + 1
          : 0
        : row.consecutiveOpens;

      const [updated] = await tx
        .update(adapterCircuitBreaker)
        .set({
          state: shouldTrip ? "open" : row.state,
          consecutiveFailures: nextFailures,
          consecutiveOpens: nextOpens,
          openedAt: shouldTrip ? new Date() : row.openedAt,
          updatedAt: new Date(),
        })
        .where(eq(adapterCircuitBreaker.source, source))
        .returning();

      return ok(updated);
    });
  } catch (error) {
    return err(
      new AppError(
        "DB_ERROR",
        `Failed to atomically record failure for source ${source}`,
        error
      )
    );
  }
}

