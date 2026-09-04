"use client";

import React from "react";
import { useQueryState, parseAsStringEnum } from "nuqs";
import { pipelineStatusEnum, type PipelineStatus } from "@/services/db/schema";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { useTranslations } from "next-intl";

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

export function FilterBar() {
  const t = useTranslations("dashboard");
  const [statusFilter, setStatusFilter] = useQueryState(
    "status",
    parseAsStringEnum<StatusOption>([
      "all",
      ...pipelineStatusEnum.enumValues,
    ]).withDefault("all"),
  );

  const [sourceFilter, setSourceFilter] = useQueryState(
    "source",
    parseAsStringEnum<SourceOption>([
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
  );

  return (
    <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs font-normal">
      {/* Source Dropdown Filter Pill */}
      <div className="relative">
        <select
          value={sourceFilter}
          onChange={(e) =>
            setSourceFilter(e.target.value as SourceOption, { shallow: false })
          }
          aria-label="Filter jobs by source platform"
          className="appearance-none bg-white dark:bg-[#18181B] border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 rounded-xl px-3.5 py-1.5 sm:px-4 sm:py-2 pr-7 hover:border-slate-300 dark:hover:border-zinc-700 transition cursor-pointer text-xs focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 font-medium"
        >
          <option value="all">{t("sourceAll")}</option>
          <option value="reliefweb">🇨🇩 ReliefWeb</option>
          <option value="emploicd">🇨🇩 Emploi.cd</option>
          <option value="congojob">🇨🇩 CongoJob</option>
          <option value="unjobs">🇨🇩 UNJobs</option>
          <option value="greenhouse">Greenhouse</option>
          <option value="ashby">Ashby</option>
          <option value="lever">Lever</option>
          <option value="remoteok">RemoteOK</option>
        </select>
        <span
          className="absolute right-2.5 top-2 sm:top-2.5 pointer-events-none text-[10px] text-gray-400 dark:text-zinc-500"
          aria-hidden="true"
        >
          ▾
        </span>
      </div>

      {/* Status Dropdown Filter Pill */}
      <div className="relative">
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as StatusOption, { shallow: false })
          }
          aria-label="Filter jobs by status"
          className="appearance-none bg-white dark:bg-[#18181B] border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 rounded-xl px-3.5 py-1.5 sm:px-4 sm:py-2 pr-7 hover:border-slate-300 dark:hover:border-zinc-700 transition cursor-pointer text-xs focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 font-medium"
        >
          <option value="all">{t("statusAll")}</option>
          <option value="saved">{t("statusSaved")}</option>
          <option value="applied">{t("statusApplied")}</option>
          <option value="interviewing">{t("statusInterviewing")}</option>
          <option value="offer">{t("statusOffer")}</option>
          <option value="rejected">{t("statusRejected")}</option>
          <option value="withdrawn">{t("statusWithdrawn")}</option>
        </select>
        <span
          className="absolute right-2.5 top-2 sm:top-2.5 pointer-events-none text-[10px] text-gray-400 dark:text-zinc-500"
          aria-hidden="true"
        >
          ▾
        </span>
      </div>

      {/* Date Range Filter */}
      <DateRangeFilter />

      <button
        aria-label={t("country")}
        className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl hover:border-slate-300 dark:hover:border-zinc-700 transition flex items-center gap-1 font-medium cursor-pointer"
      >
        <span>{t("country")}</span>
        <span
          className="text-[10px] text-gray-400 dark:text-zinc-500 ml-0.5"
          aria-hidden="true"
        >
          ▾
        </span>
      </button>

      <button
        aria-label={t("city")}
        className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl hover:border-slate-300 dark:hover:border-zinc-700 transition flex items-center gap-1 font-medium cursor-pointer"
      >
        <span>{t("city")}</span>
        <span
          className="text-[10px] text-gray-400 dark:text-zinc-500 ml-0.5"
          aria-hidden="true"
        >
          ▾
        </span>
      </button>

      <button
        aria-label={t("workplace")}
        className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl hover:border-slate-300 dark:hover:border-zinc-700 transition flex items-center gap-1 font-medium cursor-pointer"
      >
        <span>{t("workplace")}</span>
        <span
          className="text-[10px] text-gray-400 dark:text-zinc-500 ml-0.5"
          aria-hidden="true"
        >
          ▾
        </span>
      </button>
    </div>
  );
}
