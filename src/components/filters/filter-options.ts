import { type PipelineStatus } from "@/services/db/schema";

export type Source =
  | "greenhouse"
  | "remoteok"
  | "lever"
  | "ashby"
  | "reliefweb"
  | "emploicd"
  | "congojob"
  | "unjobs"
  | "manual";

export type SourceOption = "all" | Source;
export type StatusOption = "all" | PipelineStatus;

export const SOURCE_OPTIONS: { value: Source; label: string }[] = [
  { value: "reliefweb", label: "🇨🇩 ReliefWeb" },
  { value: "emploicd", label: "🇨🇩 Emploi.cd" },
  { value: "congojob", label: "🇨🇩 CongoJob" },
  { value: "unjobs", label: "🇨🇩 UNJobs" },
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
