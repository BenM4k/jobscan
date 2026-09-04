"use client";

import React from "react";
import { useTranslations } from "next-intl";

interface JobListPaginationProps {
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  currentCount: number;
}

export function JobListPagination({
  hasMore,
  isLoadingMore,
  onLoadMore,
  currentCount,
}: JobListPaginationProps) {
  const t = useTranslations("dashboard");

  return (
    <div className="flex justify-center pt-8 pb-4">
      {hasMore ? (
        <button
          onClick={onLoadMore}
          disabled={isLoadingMore}
          aria-label="Load more job postings"
          className="w-full sm:w-auto bg-white dark:bg-[#18181B] border border-slate-300 dark:border-zinc-800 hover:border-slate-400 dark:hover:border-zinc-700 text-gray-900 dark:text-slate-100 font-bold text-xs sm:text-sm px-8 py-3.5 rounded-2xl shadow-xs transition duration-200 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
        >
          {isLoadingMore ? (
            <>
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
              <span>{t("loadingMore")}</span>
            </>
          ) : (
            t("loadMore")
          )}
        </button>
      ) : currentCount >= 20 ? (
        <p className="text-xs text-gray-400 dark:text-slate-500 font-mono">
          {t("allLoaded")}
        </p>
      ) : null}
    </div>
  );
}
