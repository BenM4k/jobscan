import "server-only";

import { db } from "@/services/db";
import {
  adapterCircuitBreaker,
  AdapterCircuitBreakerSelect,
  AdapterCircuitBreakerInsert,
} from "@/services/db/schema";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";
import { eq, sql } from "drizzle-orm";

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

export const DEFAULT_PROBE_LEASE_MS = 60_000; // 1 minute probe lease

/**
 * Atomically checks breaker state and claims a half-open probe if open backoff has elapsed.
 * Only the winning claimant transitions state to 'half_open' and receives allowed = true.
 * An unexpired 'half_open' state represents an in-progress probe and returns allowed = false;
 * once the probe lease has expired, the stale probe is reclaimed and allowed = true.
 */
export async function claimHalfOpenProbe(
  source: string,
  backoffMs: number,
  probeLeaseMs: number = DEFAULT_PROBE_LEASE_MS
): Promise<Result<{ allowed: boolean }, AppError>> {
  try {
    return await db.transaction(async (tx) => {
      const selectStateWithSqlExpiry = async () => {
        const [selected] = await tx
          .select({
            state: adapterCircuitBreaker.state,
            openedAt: adapterCircuitBreaker.openedAt,
            probeExpired: sql<boolean>`${adapterCircuitBreaker.updatedAt} IS NULL OR ${adapterCircuitBreaker.updatedAt} <= NOW() - (${probeLeaseMs} * INTERVAL '1 millisecond')`,
            backoffExpired: sql<boolean>`${adapterCircuitBreaker.openedAt} IS NULL OR ${adapterCircuitBreaker.openedAt} <= NOW() - (${backoffMs} * INTERVAL '1 millisecond')`,
          })
          .from(adapterCircuitBreaker)
          .where(eq(adapterCircuitBreaker.source, source))
          .for("update")
          .limit(1);
        return selected;
      };

      let row = await selectStateWithSqlExpiry();

      if (!row) {
        const [inserted] = await tx
          .insert(adapterCircuitBreaker)
          .values({
            source,
            state: "closed",
            consecutiveFailures: 0,
            consecutiveOpens: 0,
            openedAt: null,
          })
          .onConflictDoNothing()
          .returning({ source: adapterCircuitBreaker.source });

        if (inserted) {
          return ok({ allowed: true });
        }

        row = await selectStateWithSqlExpiry();
        if (!row) {
          return ok({ allowed: true });
        }
      }

      if (row.state === "closed") {
        return ok({ allowed: true });
      }

      if (row.state === "half_open") {
        if (!row.probeExpired) {
          return ok({ allowed: false });
        }

        // Stale probe lease expired: reclaim and permit a new probe
        await tx
          .update(adapterCircuitBreaker)
          .set({ updatedAt: sql`clock_timestamp()` })
          .where(eq(adapterCircuitBreaker.source, source));
        return ok({ allowed: true });
      }

      if (row.state === "open") {
        if (!row.openedAt || row.backoffExpired) {
          await tx
            .update(adapterCircuitBreaker)
            .set({ state: "half_open", updatedAt: sql`clock_timestamp()` })
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
      const selectForUpdate = async () => {
        const [found] = await tx
          .select()
          .from(adapterCircuitBreaker)
          .where(eq(adapterCircuitBreaker.source, source))
          .for("update")
          .limit(1);
        return found;
      };

      let row = await selectForUpdate();

      if (!row) {
        const [inserted] = await tx
          .insert(adapterCircuitBreaker)
          .values({
            source,
            state: threshold <= 1 ? "open" : "closed",
            consecutiveFailures: 1,
            consecutiveOpens: 0,
            openedAt: threshold <= 1 ? sql`NOW()` : null,
          })
          .onConflictDoNothing()
          .returning();

        if (inserted) {
          return ok(inserted);
        }

        row = await selectForUpdate();
        if (!row) {
          return err(
            new AppError(
              "DB_ERROR",
              `Failed to resolve circuit breaker row for ${source}`
            )
          );
        }
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
          openedAt: shouldTrip ? sql`NOW()` : row.openedAt,
          updatedAt: sql`NOW()`,
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

