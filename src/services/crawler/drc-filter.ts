import { CrawledJob } from "./types";

/**
 * DRC Filter Logic
 * 
 * Determines whether a job is located in or targeted to the Democratic Republic of the Congo (DRC).
 * 
 * Rules & Exclusions:
 * - EXCLUDES Republic of the Congo / Congo-Brazzaville / Brazzaville explicitly to prevent false positives.
 * - Priority order:
 *   1. countryCode === "CD"
 *   2. Country name variants ("Democratic Republic of the Congo", "DR Congo", "DRC", "RDC", "Congo-Kinshasa")
 *   3. Known DRC cities (Kinshasa, Lubumbashi, Goma, Bukavu, Mbuji-Mayi, Kananga, Kisangani, Kolwezi, Beni, Bunia, etc.)
 *   4. remoteRegions array matching DRC terms
 *   5. Title / description text matching DRC terms as low-confidence fallback
 */

const EXCLUDED_TERMS = [
  "republic of the congo",
  "congo-brazzaville",
  "congo brazzaville",
  "brazzaville",
];

const DRC_COUNTRY_VARIANTS = [
  "democratic republic of the congo",
  "democratic republic of congo",
  "dr congo",
  "d.r. congo",
  "drc",
  "rdc",
  "congo-kinshasa",
  "congo kinshasa",
  "cd",
];

const DRC_CITIES = [
  "kinshasa",
  "lubumbashi",
  "goma",
  "bukavu",
  "mbuji-mayi",
  "mbujimayi",
  "kananga",
  "kisangani",
  "kolwezi",
  "beni",
  "bunia",
  "tshikapa",
  "likasi",
  "uvira",
  "matadi",
  "kikwit",
  "kindu",
  "isiro",
  "gemena",
  "bumba",
  "mbandaka",
  "kalemie",
  "gbadolite",
];

function containsExclusion(text: string): boolean {
  const lower = text.toLowerCase();
  // If it explicitly says "Democratic Republic of the Congo", don't trigger exclusion for "Congo"
  if (lower.includes("democratic republic of")) {
    return false;
  }
  return EXCLUDED_TERMS.some((term) => lower.includes(term));
}

function matchesDrcTerm(text: string): boolean {
  const lower = text.toLowerCase();
  
  // Check exact/word boundary for short acronyms like drc, rdc, cd
  for (const variant of DRC_COUNTRY_VARIANTS) {
    if (variant.length <= 3) {
      const regex = new RegExp(`\\b${variant}\\b`, "i");
      if (regex.test(lower)) return true;
    } else {
      if (lower.includes(variant)) return true;
    }
  }

  for (const city of DRC_CITIES) {
    const regex = new RegExp(`\\b${city}\\b`, "i");
    if (regex.test(lower)) return true;
  }

  return false;
}

export function isDrcJob(job: Partial<CrawledJob>): boolean {
  // 1. Check direct country code
  if (job.countryCode?.trim().toUpperCase() === "CD") {
    return true;
  }

  // Combine location fields for inspection
  const locationText = [job.country, job.city].filter(Boolean).join(" ");
  
  if (locationText) {
    if (containsExclusion(locationText)) {
      return false;
    }
    if (matchesDrcTerm(locationText)) {
      return true;
    }
  }

  // 2. Check remoteRegions array
  if (job.remoteRegions && Array.isArray(job.remoteRegions)) {
    for (const region of job.remoteRegions) {
      if (containsExclusion(region)) continue;
      if (matchesDrcTerm(region)) return true;
    }
  }

  // 3. Low-confidence fallback: Title & Description text
  const fullText = [job.title, job.description].filter(Boolean).join(" ");
  if (fullText) {
    if (containsExclusion(fullText)) {
      return false;
    }
    if (matchesDrcTerm(fullText)) {
      return true;
    }
  }

  return false;
}
