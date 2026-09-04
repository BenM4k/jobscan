"use client";

import React from "react";
import { useTranslations } from "next-intl";

interface JobListSubbarProps {
  scoringError: string | null;
  onDismissError: () => void;
  totalCount: number;
}

export function JobListSubbar({
  scoringError,
  onDismissError,
  totalCount,
}: JobListSubbarProps) {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");

  return (
    <div className="space-y-4">
      {scoringError && (
        <div
          role="alert"
          aria-live="polite"
          className="p-4 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200 text-xs font-semibold rounded-2xl flex justify-between items-center shadow-sm"
        >
          <span>⚠️ {scoringError}</span>
          <button
            onClick={onDismissError}
            aria-label="Dismiss scoring error message"
            className="text-rose-500 hover:text-rose-800 dark:hover:text-rose-100 text-xs font-bold cursor-pointer"
          >
            {tCommon("dismiss")}
          </button>
        </div>
      )}

      <div className="flex justify-between items-center text-xs text-gray-500 dark:text-zinc-400 font-sans pt-2 pb-2">
        <span>
          <strong className="text-gray-900 dark:text-slate-200 font-semibold">
            {totalCount}
          </strong>{" "}
          {t("opportunitiesMatching")}
        </span>
        <span className="text-xs text-gray-400 dark:text-zinc-500 font-sans">
          {t("sortedRecent")}
        </span>
      </div>
    </div>
  );
}
