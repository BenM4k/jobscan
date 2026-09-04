"use client";

import React, { useState, Suspense } from "react";
import { useQueryState, parseAsString } from "nuqs";
import { FilterBar } from "@/components/FilterBar";
import { FetchJobsPopover } from "@/components/FetchJobsPopover";
import { useTranslations } from "next-intl";

interface ClientShellProps {
  children: React.ReactNode;
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
