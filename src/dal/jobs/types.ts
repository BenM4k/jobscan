import {
  job,
  rawJobPayload,
  jobSourceEnum,
  jobStatusEnum,
} from "@/services/db/schema";
import * as pipelineDal from "@/dal/pipeline.dal";
import type { TailoredResumeData } from "@/lib/ai";

export type CanonicalJobInsert = typeof job.$inferInsert;
export type CanonicalJobSelect = typeof job.$inferSelect;
export type RawJobPayloadSelect = typeof rawJobPayload.$inferSelect;
export type JobSource = (typeof jobSourceEnum.enumValues)[number];
export type JobStatus = (typeof jobStatusEnum.enumValues)[number] | string;

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
  country?: string | null;
  countryCode?: string | null;
  city?: string | null;
  workplaceType?: string | null;
  remoteRegions?: string[] | null;
  fitScore: number | null;
  scoreReasoning: string | null;
  matchedSkills: string[] | null;
  missingSkills: string[] | null;
  gaps: string[] | null;
  coverLetterDraft: string | null;
  tailoredResume: string | null;
  tailoredResumeData: TailoredResumeData | null;
  status: JobStatus;
  createdAt: Date;
  updatedAt?: Date;
  embedding?: number[] | null;
  simhash?: string | null;
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
    country: null,
    countryCode: null,
    city: entry.job.location,
    workplaceType: null,
    remoteRegions: null,
    fitScore: entry.score?.finalScore
      ? Math.round(Number(entry.score.finalScore))
      : null,
    scoreReasoning: entry.score?.explanation || null,
    matchedSkills: (entry.score?.matchedSkills as string[]) || [],
    missingSkills: (entry.score?.missingSkills as string[]) || [],
    gaps: [],
    coverLetterDraft: entry.tailoredCoverLetter?.content || null,
    tailoredResume: entry.tailoredResume?.content || null,
    tailoredResumeData: null,
    status: entry.status,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}
