import React from "react";
import { JobCardSkeleton } from "@/components/JobCardSkeleton";

export default function DashboardLoading() {
  return (
    <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-8 z-10">
      <div className="space-y-7 max-w-5xl w-full mx-auto animate-pulse">
        {/* Hero Header Skeleton */}
        <div className="space-y-3 pt-2">
          <div className="w-80 sm:w-96 h-10 rounded-lg bg-slate-200/80 dark:bg-zinc-800" />
          <div className="w-64 h-8 rounded-lg bg-slate-200/80 dark:bg-zinc-800" />
          <div className="w-full max-w-xl h-4 rounded bg-slate-200/80 dark:bg-zinc-800" />
        </div>

        {/* Search & Filter Skeleton */}
        <div className="space-y-5 pt-2">
          <div className="h-10 border-b border-slate-200/90 dark:border-zinc-800" />
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-24 h-8 rounded-xl bg-slate-200/80 dark:bg-zinc-800" />
            <div className="w-24 h-8 rounded-xl bg-slate-200/80 dark:bg-zinc-800" />
            <div className="w-28 h-8 rounded-xl bg-slate-200/80 dark:bg-zinc-800" />
            <div className="w-20 h-8 rounded-xl bg-slate-200/80 dark:bg-zinc-800" />
          </div>
        </div>

        {/* Job Skeletons List */}
        <div className="divide-y divide-slate-200/70 dark:divide-zinc-800/80 pt-4">
          <JobCardSkeleton />
          <JobCardSkeleton />
          <JobCardSkeleton />
        </div>
      </div>
    </main>
  );
}
