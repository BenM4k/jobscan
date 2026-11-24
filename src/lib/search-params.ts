import {
  createSearchParamsCache,
  parseAsString,
  parseAsStringEnum,
  createParser,
} from "nuqs/server";
import { pipelineStatusEnum, type PipelineStatus } from "@/services/db/schema";
import {
  parseSourceOption,
  type SourceOption,
} from "@/components/filters/filter-options";

export const searchParamsCache = createSearchParamsCache({
  status: parseAsStringEnum<"all" | PipelineStatus>([
    "all",
    ...pipelineStatusEnum.enumValues,
  ]).withDefault("all"),
  source: createParser<SourceOption>({
    parse: parseSourceOption,
    serialize: (value) => value,
  }).withDefault("all"),
  startDate: parseAsString.withDefault(""),
  endDate: parseAsString.withDefault(""),
  q: parseAsString.withDefault(""),
});

