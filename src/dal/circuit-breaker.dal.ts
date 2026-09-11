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
