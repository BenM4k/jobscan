import { type PipelineStatus } from "@/services/db/schema";

export type Source =
  | "greenhouse"
  | "remoteok"
  | "lever"
  | "ashby"
  | "reliefweb"
  | "emploi_cd"
  | "congojob"
  | "unjobs"
  | "fecrdc"
  | "manual";

export type SourceOption = "all" | Source;
export type StatusOption = "all" | PipelineStatus;

const VALID_SOURCE_OPTIONS = new Set<SourceOption>([
  "all",
  "reliefweb",
  "emploi_cd",
  "congojob",
  "unjobs",
  "fecrdc",
  "greenhouse",
  "remoteok",
  "lever",
  "ashby",
  "manual",
]);

/** Parses source filter query param while normalizing legacy `emploicd` to `emploi_cd`. */
export function parseSourceOption(raw: string): SourceOption | null {
  const normalized = (raw === "emploicd" ? "emploi_cd" : raw) as SourceOption;
  return VALID_SOURCE_OPTIONS.has(normalized) ? normalized : null;
}

export const SOURCE_OPTIONS: { value: Source; label: string }[] = [
  { value: "reliefweb", label: "🇨🇩 ReliefWeb" },
  { value: "emploi_cd", label: "🇨🇩 Emploi.cd" },
  { value: "congojob", label: "🇨🇩 CongoJob" },
  { value: "unjobs", label: "🇨🇩 UNJobs" },
  { value: "fecrdc", label: "🇨🇩 FEC-RDC" },
  { value: "greenhouse", label: "Greenhouse" },
  { value: "ashby", label: "Ashby" },
  { value: "lever", label: "Lever" },
  { value: "remoteok", label: "RemoteOK" },
  { value: "manual", label: "Manual" },
];

export const STATUS_OPTIONS: { value: PipelineStatus; key: string }[] = [
  { value: "saved", key: "statusSaved" },
  { value: "applied", key: "statusApplied" },
  { value: "interviewing", key: "statusInterviewing" },
  { value: "offer", key: "statusOffer" },
  { value: "rejected", key: "statusRejected" },
  { value: "withdrawn", key: "statusWithdrawn" },
];
