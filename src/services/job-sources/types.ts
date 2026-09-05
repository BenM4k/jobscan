import type { RawJobPayloadSelect, JobSelect } from "@/dal/jobs.dal";
import type { Result } from "@/lib/result";
import type { AppError } from "@/lib/errors";
import type { CircuitBreaker } from "@/lib/circuit-breaker";

export interface NormalizedJob {
  externalId: string;
  source: "greenhouse" | "remoteok" | "lever" | "ashby";
  title: string;
  company: string;
  url: string;
  description: string;
  postedAt?: Date;
  country?: string;
  countryCode?: string;
  city?: string;
  workplaceType?: "remote" | "on-site" | "hybrid";
  remoteRegions?: string[];
}

export interface JobSource {
  id: "greenhouse" | "remoteok" | "lever" | "ashby";
  fetchRaw(target?: string): Promise<unknown[]>;
  normalize(raw: unknown): NormalizedJob;
}

export interface JobSourceAdapter<TRaw = unknown> extends JobSource {
  id: "greenhouse" | "remoteok" | "lever" | "ashby";
  readonly circuitBreaker?: CircuitBreaker;
  fetchRaw(target?: string): Promise<TRaw[]>;
  extractExternalId(raw: TRaw): string;
  normalize(raw: TRaw): NormalizedJob;

  /** DB Call 1: Write untouched external response to raw_job_payload */
  saveRaw(raw: TRaw): Promise<Result<RawJobPayloadSelect, AppError>>;

  /** DB Call 2: Read payload from raw_job_payload, normalize, and upsert canonical job */
  normalizeFromStored(
    rawRecord: RawJobPayloadSelect,
    userId?: string
  ): Promise<Result<JobSelect, AppError>>;

  /** Sequential pipeline orchestrator: DB call 1 (raw) -> DB call 2 (normalize & save) */
  ingest(raw: TRaw, userId?: string): Promise<Result<JobSelect, AppError>>;
}
