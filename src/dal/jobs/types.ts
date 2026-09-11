import {
  job,
  rawJobPayload,
  jobSourceEnum,
  jobStatusEnum,
  jobLanguageEnum,
} from "@/services/db/schema";
import * as pipelineDal from "@/dal/pipeline.dal";
import { computeDisplayRank } from "@/services/ranking/decay";
import type { TailoredResumeData } from "@/lib/ai";
export type { TailoredResumeData };

/**
 * Modern default model version for undecayed raw score records.
 */
export const DEFAULT_RAW_SCORE_MODEL = "hybrid-v1";

/**
 * Explicit model identifiers for legacy score records whose stored `finalScore`
 * was produced by `applyExponentialDecay` at write time.
 * For these rows, read-time exponential decay must be skipped to avoid double decay.
 */
export const LEGACY_DECAYED_SCORE_MODELS = [
  "gemini",
  "hybrid-pgvector-bm25",
  "claude",
  "openai",
  "gateway",
  "legacy",
  "legacy-decayed",
] as const;

export type LegacyDecayedScoreModel =
  (typeof LEGACY_DECAYED_SCORE_MODELS)[number];

export function isLegacyDecayedScore(modelUsed?: string | null): boolean {
  if (!modelUsed) return false;
  const normalized = modelUsed.toLowerCase().trim();
  return (
    (LEGACY_DECAYED_SCORE_MODELS as readonly string[]).includes(normalized) ||
    normalized.startsWith("legacy")
  );
}

export type CanonicalJobInsert = typeof job.$inferInsert;
export type CanonicalJobSelect = typeof job.$inferSelect;
export type RawJobPayloadSelect = typeof rawJobPayload.$inferSelect;
export type JobSource = (typeof jobSourceEnum.enumValues)[number];
export type JobStatus = (typeof jobStatusEnum.enumValues)[number] | string;
export type JobLanguage = (typeof jobLanguageEnum.enumValues)[number];

export interface JobSelect {
  id: string;
  userId: string;
  source: string;
  externalId: string;
  title: string;
  company: string;
  url: string;
  description: string | null;
  postedAt: Date | null;
  language?: JobLanguage;
  country?: string | null;
  countryCode?: string | null;
  city?: string | null;
  location?: string | null;
  rawSalaryText?: string | null;
  salaryMin?: string | number | null;
  salaryMax?: string | number | null;
  salaryCurrency?: string | null;
  salaryPeriod?: string | null;
  salaryNormalizedYearlyUsd?: string | number | null;
  workplaceType?: string | null;
  remoteRegions?: string[] | null;
  fitScore: number | null;
  displayRank?: number | null;
  scoreReasoning: string | null;
  matchedSkills: string[] | null;
  missingSkills: string[] | null;
  gaps: string[] | null;
  coverLetterDraft: string | null;
  tailoredResume: string | null;
  tailoredResumeData: TailoredResumeData | null;
  tailoredResumeRecordId?: string;
  resumeIdUsed?: string | null;
  status: JobStatus;
  createdAt: Date;
  updatedAt?: Date;
  embedding?: number[] | null;
  simhash?: bigint | string | null;
  alsoPostedOn?: string[] | null;
}

export type JobInsert = Partial<JobSelect> & {
  title: string;
  company: string;
  source: JobSource | string;
  externalId?: string;
  userId?: string;
};

export function pipelineEntryToJobSelect(
  entry: pipelineDal.PipelineEntryWithDetails,
): JobSelect {
  const rawFitScore = entry.score?.finalScore
    ? Math.round(Number(entry.score.finalScore))
    : null;
  const postedAt = entry.job.postedAt || entry.createdAt;

  // Identify legacy rows whose stored finalScore was produced by applyExponentialDecay at write time.
  // Skip read-time decay for legacy rows to avoid double decay, while retaining it for new raw-score rows.
  // Raw scores are not reconstructed from rounded stored values; fitScore remains rawFitScore.
  const isLegacy = isLegacyDecayedScore(entry.score?.modelUsed);
  const rank =
    rawFitScore !== null
      ? isLegacy
        ? rawFitScore
        : computeDisplayRank(rawFitScore, postedAt)
      : null;

  return {
    id: entry.id,
    userId: entry.userId,
    source: entry.job.source,
    externalId: entry.job.externalId || "",
    title: entry.job.title,
    company: entry.job.company,
    url: entry.job.url || "",
    description: entry.job.description,
    postedAt: entry.job.postedAt,
    language: (entry.job.language as JobLanguage) || "en",
    country: null,
    countryCode: null,
    city: entry.job.location,
    workplaceType: null,
    remoteRegions: null,
    fitScore: rawFitScore,
    displayRank: rank,
    scoreReasoning: entry.score?.explanation || null,
    matchedSkills: (entry.score?.matchedSkills as string[]) || [],
    missingSkills: (entry.score?.missingSkills as string[]) || [],
    gaps: [],
    coverLetterDraft: entry.tailoredCoverLetter?.content || null,
    tailoredResume: entry.tailoredResume?.content || null,
    tailoredResumeData: null,
    tailoredResumeRecordId: entry.tailoredResume?.id,
    resumeIdUsed: entry.resumeIdUsed,
    status: entry.status,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    alsoPostedOn: entry.alsoPostedOn || [],
  };
}

export interface JobWithSimilarity extends CanonicalJobSelect {
  similarity: number;
}
