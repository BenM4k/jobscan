"use client";

import React, { useState, Suspense } from "react";
import { FilterBar, FilterBarSkeleton } from "@/components/FilterBar";
import { FetchJobsPopover } from "@/components/FetchJobsPopover";
import { JobListSkeleton } from "@/components/job/JobListSkeleton";
import {
  FilterTransitionProvider,
  useFilterTransition,
} from "@/components/filters/FilterTransitionContext";
import { useTranslations } from "next-intl";

interface ClientShellProps {
  children: React.ReactNode;
}

/** Coordinates client-side job progress, notices, and completion events. */
function ClientShellContent({ children }: ClientShellProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");

  const { isPending } = useFilterTransition();

  return (
    <div className="space-y-7 max-w-7xl w-full mx-auto">
      {/* Hero Header Section */}
      <div className="space-y-3 pt-2">
        <h1 className="text-3xl sm:text-4xl lg:text-[40px] font-bold text-gray-900 dark:text-slate-100 leading-[1.15] tracking-tight font-sans max-w-2xl">
          {t("heroTitle")}
        </h1>

        {/* Subtitle row: text left, Fetch Jobs button right */}
        <div className="flex flex-wrap items-start justify-between gap-4 pt-1">
          <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-2xl font-sans leading-relaxed">
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

      {/* Grouped Search & Filters Section */}
      <div className="pt-2">
        <Suspense fallback={<FilterBarSkeleton />}>
          <FilterBar />
        </Suspense>
      </div>

      {/* Rendered Job List with instant visual feedback */}
      <div className="pt-2">
        {isPending ? (
          <JobListSkeleton />
        ) : (
          <div className="animate-in fade-in duration-150">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

export function ClientShell({ children }: ClientShellProps) {
  return (
    <FilterTransitionProvider>
      <ClientShellContent>{children}</ClientShellContent>
    </FilterTransitionProvider>
  );
}
