import { SimHash, HashFunction } from "@counterrealist/simhash";

/** Default Hamming distance threshold for 64-bit near-duplicate detection */
export const DEFAULT_SIMHASH_THRESHOLD = 3;

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
 */
export function normalizeTextForSimhash(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, " ") // strip HTML tags if present in descriptions
    .replace(/\s+/g, " ") // collapse all whitespace
    .trim();
}

/**
 * Builds canonical concatenated string for job deduplication.
 */
export function buildJobSimhashText(
  title: string,
  company: string,
  description?: string | null
): string {
  const normTitle = normalizeTextForSimhash(title || "");
  const normCompany = normalizeTextForSimhash(company || "");
  const normDesc = normalizeTextForSimhash(description || "");
  return `${normTitle} ${normCompany} ${normDesc}`.trim();
}

/**
 * Computes 64-bit SimHash for given text using shingling and weighted bit voting.
 * Returns signedBigInt and string representation suitable for PostgreSQL bigint/numeric.
 */
export function computeSimhash(text: string): SimhashResult {
  const normalized = normalizeTextForSimhash(text);

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
