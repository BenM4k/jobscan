import React from "react";

export function JobCardSkeleton() {
  return (
    <div className="bg-white dark:bg-[#121215] border border-gray-200 dark:border-zinc-800/80 p-6 sm:p-7 rounded-3xl min-h-[170px] sm:min-h-[190px] flex flex-col justify-between shadow-xs animate-pulse space-y-4">
      <div className="flex items-start gap-5">
        {/* Company Initial Logo Box Skeleton */}
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gray-200 dark:bg-zinc-800 shrink-0" />

        {/* Title, Company, Description & Metadata Skeleton */}
        <div className="flex-1 space-y-3 min-w-0">
          <div className="flex justify-between items-start gap-3">
            <div className="space-y-1.5 w-full">
              <div className="w-48 sm:w-64 h-5 rounded-md bg-gray-200 dark:bg-zinc-800" />
              <div className="w-32 h-4 rounded-md bg-gray-200 dark:bg-zinc-800" />
            </div>
            <div className="w-6 h-6 rounded-md bg-gray-200 dark:bg-zinc-800 shrink-0" />
          </div>

          <div className="w-full h-4 rounded-md bg-gray-200 dark:bg-zinc-800" />
          <div className="w-3/4 h-4 rounded-md bg-gray-200 dark:bg-zinc-800" />

          {/* Metadata Footer Row */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <div className="w-24 h-4 rounded-md bg-gray-200 dark:bg-zinc-800" />
            <div className="w-16 h-5 rounded-lg bg-gray-200 dark:bg-zinc-800" />
            <div className="w-20 h-4 rounded-md bg-gray-200 dark:bg-zinc-800" />
          </div>
        </div>
      </div>

      {/* AI Score Bar & Interactive Actions Skeleton */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 mt-4 sm:pt-5 sm:mt-5 border-t border-gray-100 dark:border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="w-28 h-8 rounded-xl bg-gray-200 dark:bg-zinc-800" />
          <div className="w-28 h-8 rounded-xl bg-gray-200 dark:bg-zinc-800" />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-20 h-7 rounded-xl bg-gray-200 dark:bg-zinc-800" />
          <div className="w-24 h-8 rounded-xl bg-gray-200 dark:bg-zinc-800" />
        </div>
      </div>
    </div>
  );
}
