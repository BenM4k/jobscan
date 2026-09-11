/**
 * Exponential Decay for Freshness Ranking
 *
 * Step 11: Freshness Ranking
 * Half-life formula: T_1/2 = ln(2) / LAMBDA
 * With LAMBDA = 0.0495: ln(2) / 0.0495 ≈ 14.002 days (≈ 2-week half-life).
 */
export const LAMBDA = 0.0495;

/**
 * Legacy default decay rate constant retained for backwards compatibility.
 */
export const DEFAULT_DECAY_LAMBDA = 0.05;

/**
 * Calculates exponential decay factor based on posting age in days.
 * Formula: Math.exp(-lambda * ageInDays)
 *
 * @param ageInDays Non-negative number of days since job was posted.
 * @param lambda Decay rate constant (defaults to DEFAULT_DECAY_LAMBDA = 0.05).
 * @returns Decay factor in the range (0, 1], or 1 if ageInDays <= 0.
 */
export function calculateExponentialDecay(
  ageInDays: number,
  lambda: number = DEFAULT_DECAY_LAMBDA
): number {
  if (isNaN(ageInDays) || ageInDays <= 0) {
    return 1;
  }
  return Math.exp(-lambda * ageInDays);
}

/**
 * Calculates posting age in days from a date.
 *
 * @param date Job postedAt or createdAt timestamp.
 * @param referenceDate Reference date (defaults to current time).
 * @returns Age in days (>= 0).
 */
export function getAgeInDays(
  date?: Date | string | number | null,
  referenceDate: Date = new Date()
): number {
  if (!date) return 0;
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (isNaN(d.getTime())) return 0;
  const diffMs = referenceDate.getTime() - d.getTime();
  if (diffMs <= 0) return 0;
  return diffMs / (1000 * 60 * 60 * 24);
}

/**
 * Computes the freshness decay factor for a given posting date.
 * Formula: Math.exp(-LAMBDA * ageInDays)
 *
 * Rules:
 * - Null / undefined / invalid postedAt returns 1 (no penalty).
 * - Future postedAt returns 1 (no penalty).
 * - Uses LAMBDA = 0.0495 (≈ 2-week half-life: ln(2)/14).
 *
 * @param postedAt Date, ISO string, or timestamp when the job was posted.
 * @param now Optional reference date (defaults to current date).
 * @returns Decay factor in range (0, 1], where 1 is fresh/no decay.
 */
export function decayFactor(
  postedAt?: Date | string | number | null,
  now?: Date | string | number | null
): number {
  if (!postedAt) return 1;

  const postedDate =
    typeof postedAt === "string" || typeof postedAt === "number"
      ? new Date(postedAt)
      : postedAt;

  if (isNaN(postedDate.getTime())) return 1;

  const referenceDate = now
    ? typeof now === "string" || typeof now === "number"
      ? new Date(now)
      : now
    : new Date();

  if (isNaN(referenceDate.getTime())) return 1;

  const diffMs = referenceDate.getTime() - postedDate.getTime();
  if (diffMs <= 0) return 1;

  const ageInDays = diffMs / (1000 * 60 * 60 * 24);
  return Math.exp(-LAMBDA * ageInDays);
}

/**
 * Computes displayRank at READ / DISPLAY time only without mutating stored finalScore:
 * displayRank = hybridScore * decayFactor(postedAt, now)
 *
 * @param hybridScore Undecayed score (0-100).
 * @param postedAt Job posting date.
 * @param now Optional reference date.
 * @returns Freshness-decayed display rank clamped to [0, 100].
 */
export function computeDisplayRank(
  hybridScore: number,
  postedAt?: Date | string | number | null,
  now?: Date | string | number | null
): number {
  const factor = decayFactor(postedAt, now);
  return Math.min(100, Math.max(0, Math.round(hybridScore * factor)));
}

/**
 * Applies exponential decay to a raw score and clamps it to [0, 100].
 *
 * @param rawScore Undecayed score (0-100).
 * @param ageInDays Age in days.
 * @param lambda Decay rate constant (defaults to LAMBDA = 0.0495).
 * @returns Decayed score as an integer clamped to [0, 100].
 */
export function applyExponentialDecay(
  rawScore: number,
  ageInDays: number,
  lambda: number = DEFAULT_DECAY_LAMBDA
): number {
  const factor = calculateExponentialDecay(ageInDays, lambda);
  return Math.min(100, Math.max(0, Math.round(rawScore * factor)));
}
