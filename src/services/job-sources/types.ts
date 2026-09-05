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

const US_CA_STATE_PROVINCE_CODES = new Set([
  // US States & Territories
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  "DC", "PR", "VI", "GU",
  // Canadian Provinces
  "AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT",
  // US States and Territories full names (lowercased)
  "alabama", "alaska", "arizona", "arkansas", "california", "colorado", "connecticut",
  "delaware", "florida", "georgia", "hawaii", "idaho", "illinois", "indiana", "iowa",
  "kansas", "kentucky", "louisiana", "maine", "maryland", "massachusetts", "michigan",
  "minnesota", "mississippi", "missouri", "montana", "nebraska", "nevada", "new hampshire",
  "new jersey", "new mexico", "new york", "north carolina", "north dakota", "ohio",
  "oklahoma", "oregon", "pennsylvania", "rhode island", "south carolina", "south dakota",
  "tennessee", "texas", "utah", "vermont", "virginia", "washington", "west virginia",
  "wisconsin", "wyoming", "district of columbia", "puerto rico", "guam", "virgin islands",
  // Canadian Provinces full names (lowercased)
  "alberta", "british columbia", "manitoba", "new brunswick", "newfoundland and labrador",
  "nova scotia", "ontario", "prince edward island", "quebec", "saskatchewan",
  "northwest territories", "nunavut", "yukon",
]);

export function isValidCountry(candidate?: string): boolean {
  if (!candidate || !candidate.trim()) return false;
  const trimmed = candidate.trim();
  if (
    US_CA_STATE_PROVINCE_CODES.has(trimmed.toUpperCase()) ||
    US_CA_STATE_PROVINCE_CODES.has(trimmed.toLowerCase())
  ) {
    return false;
  }
  return true;
}
