import { createSearchParamsCache, parseAsString, parseAsStringEnum } from "nuqs/server";
import { pipelineStatusEnum, type PipelineStatus } from "@/services/db/schema";

export const searchParamsCache = createSearchParamsCache({
  status: parseAsStringEnum<"all" | PipelineStatus>([
    "all",
    ...pipelineStatusEnum.enumValues,
  ]).withDefault("all"),
  source: parseAsStringEnum<
    | "all"
    | "reliefweb"
    | "emploi_cd"
    | "congojob"
    | "unjobs"
    | "fecrdc"
    | "greenhouse"
    | "remoteok"
    | "lever"
    | "ashby"
    | "manual"
  >([
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
  ]).withDefault("all"),
  startDate: parseAsString.withDefault(""),
  endDate: parseAsString.withDefault(""),
  q: parseAsString.withDefault(""),
});

