import { createSearchParamsCache, parseAsString, parseAsStringEnum } from "nuqs/server";
import { legacyJobStatusEnum as jobStatusEnum } from "@/services/db/schema";

export const searchParamsCache = createSearchParamsCache({
  status: parseAsStringEnum<"all" | (typeof jobStatusEnum)[number]>([
    "all",
    ...jobStatusEnum,
  ]).withDefault("all"),
  source: parseAsStringEnum<
    | "all"
    | "reliefweb"
    | "emploicd"
    | "congojob"
    | "unjobs"
    | "greenhouse"
    | "remoteok"
    | "lever"
    | "ashby"
    | "manual"
  >([
    "all",
    "reliefweb",
    "emploicd",
    "congojob",
    "unjobs",
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

