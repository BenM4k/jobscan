import "server-only";

import * as jobsDal from "@/dal/jobs.dal";
import { Result, ok, err } from "@/lib/result";
import { AppError } from "@/lib/errors";

import { MAX_HAMMING_DISTANCE } from "./simhash";

export const LOOKBACK_DAYS = 30;
export { MAX_HAMMING_DISTANCE };

/**
 * Searches for an existing near-duplicate canonical job within LOOKBACK_DAYS (30 days)
 * whose SimHash Hamming distance is <= MAX_HAMMING_DISTANCE (4).
 *
 * @param simhash 64-bit SimHash (as bigint or string representation)
 * @param options Optional overrides for lookback window, max distance, or exclusion
 * @returns Result containing the matched canonical job ID or null if no near-duplicate exists.
 */
export async function findNearDuplicateJobId(
  simhash: bigint | string,
  options?: {
    lookbackDays?: number;
    maxDistance?: number;
    excludeJobId?: string;
  }
): Promise<Result<string | null, AppError>> {
  const lookback = options?.lookbackDays ?? LOOKBACK_DAYS;
  const maxDistance = options?.maxDistance ?? MAX_HAMMING_DISTANCE;

  const matchRes = await jobsDal.findJobBySimhash(
    simhash,
    maxDistance,
    lookback,
    options?.excludeJobId
  );

  if (!matchRes.ok) {
    return err(matchRes.error);
  }

  return ok(matchRes.value?.id ?? null);
}
