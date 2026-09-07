/**
 * Default decay rate lambda.
 * With lambda = 0.05, half-life is ln(2)/0.05 ≈ 13.86 days (~2 weeks).
 * - 0 days: exp(0) = 1.0 (100% score)
 * - 7 days: exp(-0.35) ≈ 0.705 (~70.5% score)
 * - 14 days: exp(-0.70) ≈ 0.497 (~50% score)
 * - 30 days: exp(-1.50) ≈ 0.223 (~22.3% score)
 */
export const DEFAULT_DECAY_LAMBDA = 0.05;

/**
 * Pure function: calculates exponential decay factor based on posting age in days.
 * Formula: Math.exp(-lambda * ageInDays)
 *
 * @param ageInDays Non-negative number of days since job was posted.
 * @param lambda Decay rate constant (defaults to 0.05).
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
  date?: Date | string | null,
  referenceDate: Date = new Date()
): number {
  if (!date) return 0;
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return 0;
  const diffMs = referenceDate.getTime() - d.getTime();
  if (diffMs <= 0) return 0;
  return diffMs / (1000 * 60 * 60 * 24);
}

/**
 * Applies exponential decay to a raw score and clamps it to [0, 100].
 *
 * @param rawScore Undecayed score (0-100).
 * @param ageInDays Age in days.
 * @param lambda Decay rate constant (defaults to 0.05).
 * @returns Decayed score as an integer clamped to [0, 100].
 */
export function applyExponentialDecay(
  rawScore: number,
  ageInDays: number,
  lambda: number = DEFAULT_DECAY_LAMBDA
): number {
  const decayFactor = calculateExponentialDecay(ageInDays, lambda);
  return Math.min(100, Math.max(0, Math.round(rawScore * decayFactor)));
}
