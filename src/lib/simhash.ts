import { SimHash, HashFunction } from "@counterrealist/simhash";
import { normalizeText } from "@/services/dedup/normalize-text";

export { normalizeText };

/** Default Hamming distance threshold for 64-bit near-duplicate detection */
export const MAX_HAMMING_DISTANCE = 4;
export const DEFAULT_SIMHASH_THRESHOLD = 4;

const simhasher = new SimHash({
  ngramSize: 3,
  hashFunction: HashFunction.SIPHASH,
});

export interface SimhashResult {
  signedBigInt: bigint;
  hashString: string;
  hex: string;
}

/**
 * Normalizes text content for stable SimHash generation across minor whitespace/casing variations.
 * Strips HTML, converts to lowercase, strips punctuation, and collapses whitespace.
 */
export const normalizeTextForSimhash = normalizeText;

/**
 * Builds canonical concatenated string for job deduplication:
 * title + company + description (normalized).
 */
export function buildJobSimhashText(
  title: string,
  company: string,
  description?: string | null
): string {
  const normTitle = normalizeText(title || "");
  const normCompany = normalizeText(company || "");
  const normDesc = normalizeText(description || "");
  return `${normTitle} ${normCompany} ${normDesc}`.trim();
}

/**
 * Computes 64-bit SimHash for given text using shingling and weighted bit voting.
 * Returns signedBigInt (bigint) and string representation suitable for PostgreSQL bigint.
 */
export function computeSimhash(text: string): SimhashResult {
  const normalized = normalizeText(text);

  // @counterrealist/simhash requires text length >= ngramSize (3)
  const safeText =
    normalized.length >= 3
      ? normalized
      : normalized.padEnd(3, " ");

  const buf = simhasher.compute_buffer(safeText);
  const signedBigInt = buf.readBigInt64BE(0);
  const hex = buf.toString("hex");

  return {
    signedBigInt,
    hashString: signedBigInt.toString(),
    hex,
  };
}

/**
 * Computes the Hamming distance (number of differing bits) between two 64-bit hashes.
 */
export function hammingDistance(
  a: bigint | string,
  b: bigint | string
): number {
  const bigA = typeof a === "bigint" ? a : BigInt(a);
  const bigB = typeof b === "bigint" ? b : BigInt(b);

  const xor = BigInt.asUintN(64, bigA ^ bigB);
  const bitString = xor.toString(2);

  let count = 0;
  for (let i = 0; i < bitString.length; i++) {
    if (bitString[i] === "1") {
      count++;
    }
  }
  return count;
}
