import React from "react";

export default function SettingsLoading() {
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full space-y-8 animate-pulse z-10">
      {/* Header Skeleton */}
      <div className="space-y-3 border-b border-slate-200 dark:border-zinc-800/80 pb-6">
        <div className="h-6 w-36 rounded-md bg-slate-200 dark:bg-zinc-800" />
        <div className="h-8 w-64 rounded-lg bg-slate-200 dark:bg-zinc-800" />
        <div className="h-4 w-96 max-w-full rounded-md bg-slate-200 dark:bg-zinc-800" />
      </div>

      {/* Cards Skeleton */}
      <div className="space-y-6">
        {/* Card 1: Account Settings Skeleton */}
        <div className="bg-white dark:bg-[#121216] rounded-2xl border border-slate-200 dark:border-zinc-800/80 p-6 space-y-5">
          <div className="flex items-center gap-4 border-b border-slate-100 dark:border-zinc-800/80 pb-5">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-slate-200 dark:bg-zinc-800 shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-5 w-40 bg-slate-200 dark:bg-zinc-800 rounded-md" />
              <div className="h-4 w-52 bg-slate-200 dark:bg-zinc-800 rounded-md" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="h-16 rounded-xl bg-slate-100 dark:bg-zinc-900" />
            <div className="h-16 rounded-xl bg-slate-100 dark:bg-zinc-900" />
          </div>
        </div>

        {/* Card 2: AI Usage Skeleton */}
        <div className="bg-white dark:bg-[#121216] rounded-2xl border border-slate-200 dark:border-zinc-800/80 p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 pb-5">
            <div className="space-y-2">
              <div className="h-5 w-56 bg-slate-200 dark:bg-zinc-800 rounded-md" />
              <div className="h-3.5 w-80 max-w-full bg-slate-200 dark:bg-zinc-800 rounded-md" />
            </div>
            <div className="h-6 w-20 bg-slate-200 dark:bg-zinc-800 rounded-md" />
          </div>
          <div className="space-y-2 pt-2">
            <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-zinc-800" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-3 border-t border-slate-100 dark:border-zinc-800/60">
            <div className="h-16 rounded-xl bg-slate-100 dark:bg-zinc-900" />
            <div className="h-16 rounded-xl bg-slate-100 dark:bg-zinc-900" />
            <div className="h-16 rounded-xl bg-slate-100 dark:bg-zinc-900" />
          </div>
        </div>

        {/* Card 3: Feature Flags Skeleton */}
        <div className="bg-white dark:bg-[#121216] rounded-2xl border border-slate-200 dark:border-zinc-800/80 p-6 space-y-5">
          <div className="border-b border-slate-100 dark:border-zinc-800/80 pb-5 space-y-2">
            <div className="h-5 w-64 bg-slate-200 dark:bg-zinc-800 rounded-md" />
            <div className="h-3.5 w-96 max-w-full bg-slate-200 dark:bg-zinc-800 rounded-md" />
          </div>
          <div className="divide-y divide-slate-100 dark:divide-zinc-800/60">
            {[1, 2, 3].map((i) => (
              <div key={i} className="py-4 flex items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-36 bg-slate-200 dark:bg-zinc-800 rounded-md" />
                  <div className="h-3 w-64 bg-slate-200 dark:bg-zinc-800 rounded-md" />
                </div>
                <div className="h-6 w-11 rounded-full bg-slate-200 dark:bg-zinc-800 shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Card 4: Notification Preferences Skeleton */}
        <div className="bg-white dark:bg-[#121216] rounded-2xl border border-slate-200 dark:border-zinc-800/80 p-6 space-y-5">
          <div className="border-b border-slate-100 dark:border-zinc-800/80 pb-5 space-y-2">
            <div className="h-5 w-60 bg-slate-200 dark:bg-zinc-800 rounded-md" />
            <div className="h-3.5 w-80 max-w-full bg-slate-200 dark:bg-zinc-800 rounded-md" />
          </div>
          <div className="flex items-center justify-between gap-4 pt-1">
            <div className="space-y-2">
              <div className="h-4 w-48 bg-slate-200 dark:bg-zinc-800 rounded-md" />
              <div className="h-3 w-64 bg-slate-200 dark:bg-zinc-800 rounded-md" />
            </div>
            <div className="h-6 w-11 rounded-full bg-slate-200 dark:bg-zinc-800 shrink-0" />
          </div>
        </div>
      </div>
    </main>
  );
}
