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

const SOURCE_OPTIONS: { value: Source; label: string }[] = [
  { value: "reliefweb", label: "🇨🇩 ReliefWeb" },
  { value: "emploicd", label: "🇨🇩 Emploi.cd" },
  { value: "congojob", label: "🇨🇩 CongoJob" },
  { value: "unjobs", label: "🇨🇩 UNJobs" },
  { value: "greenhouse", label: "Greenhouse" },
  { value: "ashby", label: "Ashby" },
  { value: "lever", label: "Lever" },
  { value: "remoteok", label: "RemoteOK" },
];

const STATUS_OPTIONS: { value: PipelineStatus; key: string }[] = [
  { value: "saved", key: "statusSaved" },
  { value: "applied", key: "statusApplied" },
  { value: "interviewing", key: "statusInterviewing" },
  { value: "offer", key: "statusOffer" },
  { value: "rejected", key: "statusRejected" },
  { value: "withdrawn", key: "statusWithdrawn" },
];

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

  const isSourceActive = sourceFilter !== "all";
  const isStatusActive = statusFilter !== "all";

  const formatStatus = (key: string) => {
    const raw = t(key);
    return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  };

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
          className={`appearance-none rounded-xl px-3.5 py-1.5 sm:px-4 sm:py-2 pr-7 transition cursor-pointer text-base sm:text-xs focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 font-medium border ${
            isSourceActive
              ? "bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300"
              : "bg-white dark:bg-[#18181B] border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-700"
          }`}
        >
          <option value="all">{t("sourceAll")}</option>
          {SOURCE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {isSourceActive && sourceFilter === opt.value
                ? `Source: ${opt.label}`
                : opt.label}
            </option>
          ))}
        </select>
        <span
          className={`absolute right-2.5 top-2 sm:top-2.5 pointer-events-none text-[10px] ${
            isSourceActive
              ? "text-blue-600 dark:text-blue-400"
              : "text-gray-400 dark:text-zinc-500"
          }`}
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
          className={`appearance-none rounded-xl px-3.5 py-1.5 sm:px-4 sm:py-2 pr-7 transition cursor-pointer text-base sm:text-xs focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 font-medium border ${
            isStatusActive
              ? "bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300"
              : "bg-white dark:bg-[#18181B] border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-700"
          }`}
        >
          <option value="all">{t("statusAll")}</option>
          {STATUS_OPTIONS.map((opt) => {
            const label = formatStatus(opt.key);
            return (
              <option key={opt.value} value={opt.value}>
                {isStatusActive && statusFilter === opt.value
                  ? `Status: ${label}`
                  : label}
              </option>
            );
          })}
        </select>
        <span
          className={`absolute right-2.5 top-2 sm:top-2.5 pointer-events-none text-[10px] ${
            isStatusActive
              ? "text-blue-600 dark:text-blue-400"
              : "text-gray-400 dark:text-zinc-500"
          }`}
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
