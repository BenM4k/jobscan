import "server-only";

import * as circuitBreakerDal from "@/dal/circuit-breaker.dal";
import { AdapterCircuitBreakerSelect } from "@/services/db/schema";

export const FAILURE_THRESHOLD = 5;
export const BASE_BACKOFF_MS = 60 * 1000; // 1 minute
export const MAX_BACKOFF_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Calculates exponential backoff window:
 * min(30min, 1min * 2^consecutiveOpens)
 *
 * consecutiveOpens = 0 -> 1 min
 * consecutiveOpens = 1 -> 2 min
 * consecutiveOpens = 2 -> 4 min
 * consecutiveOpens = 3 -> 8 min
 * consecutiveOpens = 4 -> 16 min
 * consecutiveOpens >= 5 -> capped at 30 min
 */
export function calculateBackoffMs(consecutiveOpens: number): number {
  const exponent = Math.max(0, consecutiveOpens);
  const backoff = BASE_BACKOFF_MS * Math.pow(2, exponent);
  return Math.min(MAX_BACKOFF_MS, backoff);
}

/**
 * Ensures an adapter row exists in adapter_circuit_breaker table.
 */
async function getOrCreateBreaker(
  source: string
): Promise<AdapterCircuitBreakerSelect> {
  const existingRes = await circuitBreakerDal.getCircuitBreaker(source);
  if (existingRes.ok && existingRes.value) {
    return existingRes.value;
  }

  const insertRes = await circuitBreakerDal.upsertCircuitBreaker({
    source,
    state: "closed",
    consecutiveFailures: 0,
    consecutiveOpens: 0,
    openedAt: null,
  });

  if (insertRes.ok) {
    return insertRes.value;
  }

  // Fallback memory shape in extreme DB error condition
  return {
    source,
    state: "closed",
    consecutiveFailures: 0,
    consecutiveOpens: 0,
    openedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Determines whether a fetch call to the given adapter source is permitted.
 * If breaker is CLOSED: returns true.
 * If breaker is HALF_OPEN: returns true (allowing test probe call).
 * If breaker is OPEN: checks if backoff window has elapsed.
 *   - If elapsed: transitions open -> half_open in Postgres and returns true.
 *   - If still active: returns false.
 */
export async function canAttempt(source: string): Promise<boolean> {
  const row = await getOrCreateBreaker(source);

  if (row.state === "closed") {
    return true;
  }

  const backoffMs = calculateBackoffMs(row.consecutiveOpens);
  const claimRes = await circuitBreakerDal.claimHalfOpenProbe(source, backoffMs);
  if (claimRes.ok) {
    return claimRes.value.allowed;
  }

  return true;
}

/**
 * Records a successful fetch from an adapter:
 * Resets consecutiveFailures to 0, transitions state to 'closed', clears openedAt.
 */
export async function recordSuccess(source: string): Promise<void> {
  await circuitBreakerDal.upsertCircuitBreaker({
    source,
    state: "closed",
    consecutiveFailures: 0,
    consecutiveOpens: 0,
    openedAt: null,
  });
}

/**
 * Records a failed fetch from an adapter atomically in Postgres:
 * Increments consecutiveFailures, checks half_open or FAILURE_THRESHOLD,
 * and trips the breaker OPEN with updated openedAt and consecutiveOpens.
 */
export async function recordFailure(source: string): Promise<void> {
  await circuitBreakerDal.recordFailureAtomic(source, FAILURE_THRESHOLD);
}

