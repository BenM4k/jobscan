export interface KeywordCoverageResult {
  covered: string[];
  missing: string[];
  total: number;
  percent: number;
}

const MAX_TRACKED_KEYWORDS = 24;

function normalizeSkillList(
  matchedSkills?: string[] | null,
  missingSkills?: string[] | null
): string[] {
  const seen = new Set<string>();
  const combined: string[] = [];

  for (const raw of [...(matchedSkills ?? []), ...(missingSkills ?? [])]) {
    const clean = raw?.trim();
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    combined.push(clean);
    if (combined.length >= MAX_TRACKED_KEYWORDS) break;
  }

  return combined;
}

/**
 * Evaluates which matched/missing ATS keywords from job scoring appear in the user's draft text.
 */
export function computeKeywordCoverage(
  draftText: string,
  matchedSkills?: string[] | null,
  missingSkills?: string[] | null
): KeywordCoverageResult {
  const keywords = normalizeSkillList(matchedSkills, missingSkills);
  if (keywords.length === 0) {
    return { covered: [], missing: [], total: 0, percent: 0 };
  }

  const lowerDraft = draftText.toLowerCase();
  const covered: string[] = [];
  const missing: string[] = [];

  for (const keyword of keywords) {
    const lowerKw = keyword.toLowerCase();
    if (lowerDraft.includes(lowerKw)) {
      covered.push(keyword);
    } else {
      missing.push(keyword);
    }
  }

  const total = keywords.length;
  const percent = Math.round((covered.length / total) * 100);
  return { covered, missing, total, percent };
}
