import {
  job,
  rawJobPayload,
  jobSourceEnum,
  jobStatusEnum,
  jobLanguageEnum,
} from "@/services/db/schema";
import * as pipelineDal from "@/dal/pipeline.dal";
import { decayFactor } from "@/services/ranking/decay";
import type { TailoredResumeData } from "@/lib/ai";
export type { TailoredResumeData };

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
  entry: pipelineDal.PipelineEntryWithDetails
): JobSelect {
  const rawFitScore = entry.score?.finalScore
    ? Math.round(Number(entry.score.finalScore))
    : null;
  const postedAt = entry.job.postedAt || entry.createdAt;
  const rank =
    rawFitScore !== null
      ? Math.min(100, Math.max(0, Math.round(rawFitScore * decayFactor(postedAt))))
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
