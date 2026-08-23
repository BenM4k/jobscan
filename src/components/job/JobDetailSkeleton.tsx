import React from "react";

export function JobDetailSkeleton() {
  return (
    <div className="space-y-10 sm:space-y-12 animate-pulse">
      {/* Header Skeleton */}
      <header className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-xl bg-slate-200/80 dark:bg-zinc-800 shrink-0" />

            <div className="space-y-2.5 min-w-0">
              <div className="flex items-center gap-2">
                <div className="w-14 h-4 rounded bg-slate-200/80 dark:bg-zinc-800" />
                <div className="w-24 h-4 rounded bg-slate-200/80 dark:bg-zinc-800" />
              </div>

              {/* Title */}
              <div className="w-64 sm:w-96 h-8 rounded-lg bg-slate-200/80 dark:bg-zinc-800" />

              {/* Company */}
              <div className="w-40 h-4 rounded bg-slate-200/80 dark:bg-zinc-800" />

              {/* Pills */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <div className="w-20 h-6 rounded-md bg-slate-200/80 dark:bg-zinc-800" />
                <div className="w-32 h-6 rounded-md bg-slate-200/80 dark:bg-zinc-800" />
                <div className="w-24 h-6 rounded-md bg-slate-200/80 dark:bg-zinc-800" />
              </div>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
            <div className="w-40 h-10 rounded-xl bg-slate-200/80 dark:bg-zinc-800" />
            <div className="w-32 h-4 rounded bg-slate-200/80 dark:bg-zinc-800" />
          </div>
        </div>
      </header>

      {/* AI Fit Score Section Skeleton */}
      <section className="bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-zinc-800 p-6 sm:p-8 rounded-2xl shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="w-44 h-5 rounded bg-slate-200/80 dark:bg-zinc-800" />
            <div className="w-64 h-3.5 rounded bg-slate-200/80 dark:bg-zinc-800" />
          </div>
          <div className="w-32 h-9 rounded-xl bg-slate-200/80 dark:bg-zinc-800" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900 space-y-2">
            <div className="w-20 h-4 rounded bg-slate-200/80 dark:bg-zinc-800" />
            <div className="w-12 h-6 rounded bg-slate-200/80 dark:bg-zinc-800" />
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900 space-y-2">
            <div className="w-24 h-4 rounded bg-slate-200/80 dark:bg-zinc-800" />
            <div className="w-16 h-6 rounded bg-slate-200/80 dark:bg-zinc-800" />
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900 space-y-2">
            <div className="w-28 h-4 rounded bg-slate-200/80 dark:bg-zinc-800" />
            <div className="w-14 h-6 rounded bg-slate-200/80 dark:bg-zinc-800" />
          </div>
        </div>
      </section>

      {/* Tailored Resume Section Skeleton */}
      <section className="bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-zinc-800 p-6 sm:p-8 rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="w-48 h-5 rounded bg-slate-200/80 dark:bg-zinc-800" />
          <div className="w-28 h-8 rounded-xl bg-slate-200/80 dark:bg-zinc-800" />
        </div>
        <div className="space-y-2.5 pt-2">
          <div className="w-full h-4 rounded bg-slate-200/80 dark:bg-zinc-800" />
          <div className="w-5/6 h-4 rounded bg-slate-200/80 dark:bg-zinc-800" />
          <div className="w-4/6 h-4 rounded bg-slate-200/80 dark:bg-zinc-800" />
        </div>
      </section>

      {/* Cover Letter Section Skeleton */}
      <section className="bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-zinc-800 p-6 sm:p-8 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="w-52 h-5 rounded bg-slate-200/80 dark:bg-zinc-800" />
            <div className="w-72 h-3.5 rounded bg-slate-200/80 dark:bg-zinc-800" />
          </div>
          <div className="w-32 h-8 rounded-xl bg-slate-200/80 dark:bg-zinc-800 shrink-0" />
        </div>
        <div className="space-y-2.5 pt-2">
          <div className="w-full h-4 rounded bg-slate-200/80 dark:bg-zinc-800" />
          <div className="w-4/5 h-4 rounded bg-slate-200/80 dark:bg-zinc-800" />
        </div>
      </section>

      {/* Job Description Section Skeleton */}
      <section className="bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-zinc-800 p-6 sm:p-8 rounded-2xl shadow-xs space-y-4">
        <div className="w-40 h-5 rounded bg-slate-200/80 dark:bg-zinc-800" />
        <div className="space-y-2 pt-2">
          <div className="w-full h-3.5 rounded bg-slate-200/80 dark:bg-zinc-800" />
          <div className="w-full h-3.5 rounded bg-slate-200/80 dark:bg-zinc-800" />
          <div className="w-4/5 h-3.5 rounded bg-slate-200/80 dark:bg-zinc-800" />
          <div className="w-3/5 h-3.5 rounded bg-slate-200/80 dark:bg-zinc-800" />
        </div>
      </section>
    </div>
  );
}
