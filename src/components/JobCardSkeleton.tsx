import React from "react";

export function JobCardSkeleton() {
  return (
    <div className="py-8 sm:py-9 animate-pulse space-y-5">
      {/* Top Header: Avatar + Info */}
      <div className="flex items-start gap-4 sm:gap-5">
        {/* Company Initial Box Skeleton */}
        <div className="w-12 h-12 rounded-lg bg-slate-200/80 dark:bg-zinc-800 shrink-0" />

        {/* Title, Company, Description & Tags */}
        <div className="flex-1 space-y-2.5 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5 w-full">
              <div className="w-56 sm:w-80 h-6 rounded-md bg-slate-200/80 dark:bg-zinc-800" />
              <div className="w-32 h-4 rounded-md bg-slate-200/80 dark:bg-zinc-800" />
            </div>
            <div className="w-12 h-5 rounded-md bg-slate-200/80 dark:bg-zinc-800 shrink-0" />
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="w-full h-3.5 rounded bg-slate-200/80 dark:bg-zinc-800" />
            <div className="w-3/4 h-3.5 rounded bg-slate-200/80 dark:bg-zinc-800" />
          </div>

          {/* Badges / Meta row */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <div className="w-16 h-4 rounded bg-slate-200/80 dark:bg-zinc-800" />
            <div className="w-16 h-5 rounded-md bg-slate-200/80 dark:bg-zinc-800" />
            <div className="w-24 h-4 rounded bg-slate-200/80 dark:bg-zinc-800" />
            <div className="w-16 h-4 rounded bg-slate-200/80 dark:bg-zinc-800" />
          </div>
        </div>
      </div>

      {/* Bottom Bar: Status / AI Engine + Score CTA */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="w-24 h-4 rounded bg-slate-200/80 dark:bg-zinc-800" />
          <div className="w-28 h-4 rounded bg-slate-200/80 dark:bg-zinc-800" />
        </div>
        <div className="w-28 h-8 rounded-xl bg-slate-200/80 dark:bg-zinc-800 shrink-0" />
      </div>
    </div>
  );
}
