"use client";

import React, { useState, Suspense } from "react";
import { useQueryState, parseAsString, parseAsStringEnum } from "nuqs";
import { JobStatus, legacyJobStatusEnum as jobStatusEnum } from "@/services/db/schema";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { FetchJobsPopover } from "@/components/FetchJobsPopover";
import { useTranslations } from "next-intl";

interface ClientShellProps {
  children: React.ReactNode;
}

type Source =
  | "greenhouse"
  | "remoteok"
  | "lever"
  | "ashby"
  | "reliefweb"
  | "emploicd"
  | "congojob"
  | "unjobs"
  | "manual";

type SourceOption = "all" | Source;
type StatusOption = "all" | JobStatus;

function FilterBar() {
  const t = useTranslations("dashboard");
  const [statusFilter, setStatusFilter] = useQueryState(
    "status",
    parseAsStringEnum<StatusOption>(["all", ...jobStatusEnum]).withDefault(
      "all",
    ),
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
          <option value="new">{t("statusNew")}</option>
          <option value="scored">{t("statusScored")}</option>
          <option value="applied">{t("statusApplied")}</option>
          <option value="interviewing">{t("statusInterviewing")}</option>
          <option value="rejected">{t("statusRejected")}</option>
          <option value="offer">{t("statusOffer")}</option>
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

export function ClientShell({ children }: ClientShellProps) {
  const [searchQuery, setSearchQuery] = useQueryState(
    "q",
    parseAsString.withDefault("").withOptions({ shallow: false, throttleMs: 300 }),
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");

  return (
    <div className="space-y-7 max-w-5xl w-full mx-auto">
      {/* Hero Header Section */}
      <div className="space-y-3 pt-2">
        <h1 className="text-3xl sm:text-4xl lg:text-[40px] font-bold text-gray-900 dark:text-slate-100 leading-[1.15] tracking-tight font-sans max-w-xl">
          {t("heroTitle")}
        </h1>

        {/* Subtitle row: text left, Fetch Jobs button right */}
        <div className="flex flex-wrap items-start justify-between gap-4 pt-1">
          <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-xl font-sans leading-relaxed">
            {t("heroSubtitle")}
          </p>

          <div className="shrink-0">
            <FetchJobsPopover
              onSuccess={(msg) => {
                setSuccessMsg(msg);
                setErrorMsg(null);
              }}
              onError={(msg) => {
                setErrorMsg(msg);
                setSuccessMsg(null);
              }}
            />
          </div>
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          aria-live="polite"
          className="p-4 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200 text-xs font-semibold rounded-2xl flex justify-between items-center shadow-sm"
        >
          <span>⚠️ {errorMsg}</span>
          <button
            onClick={() => setErrorMsg(null)}
            aria-label="Dismiss error message"
            className="text-xs font-bold opacity-75 hover:opacity-100 cursor-pointer"
          >
            {tCommon("dismiss")}
          </button>
        </div>
      )}

      {successMsg && (
        <div
          role="alert"
          aria-live="polite"
          className="p-4 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-200 text-xs font-semibold rounded-2xl flex justify-between items-center shadow-sm"
        >
          <span>✅ {successMsg}</span>
          <button
            onClick={() => setSuccessMsg(null)}
            aria-label="Dismiss notification message"
            className="text-xs font-bold opacity-75 hover:opacity-100 cursor-pointer"
          >
            {tCommon("dismiss")}
          </button>
        </div>
      )}

      {/* Search Bar & Filter Pills Section */}
      <div className="space-y-5 pt-2">
        {/* Clean Search Input with bottom border line */}
        <div className="relative pb-3 border-b border-slate-200/90 dark:border-zinc-800 flex items-center">
          <span
            className="text-gray-400 dark:text-zinc-500 text-sm mr-3 select-none"
            aria-hidden="true"
          >
            🔍
          </span>
          <input
            id="job-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            className="w-full bg-transparent text-gray-900 dark:text-slate-100 text-sm font-normal focus:outline-none placeholder-gray-400 dark:placeholder-zinc-500"
          />
        </div>

        {/* Filter Pills Row */}
        <Suspense
          fallback={
            <div className="flex flex-wrap items-center gap-2.5 text-xs font-medium">
              <div className="w-28 h-8 rounded-xl bg-slate-200 dark:bg-zinc-800 animate-pulse" />
              <div className="w-28 h-8 rounded-xl bg-slate-200 dark:bg-zinc-800 animate-pulse" />
              <div className="w-28 h-8 rounded-xl bg-slate-200 dark:bg-zinc-800 animate-pulse" />
            </div>
          }
        >
          <FilterBar />
        </Suspense>
      </div>

      {/* Rendered Job List */}
      <div className="pt-2">{children}</div>
    </div>
  );
}
