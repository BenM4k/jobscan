import React from "react";

export function AddJobSkeleton() {
  return (
    <div className="max-w-6xl w-full mx-auto space-y-6 animate-pulse font-sans">
      <div className="space-y-2">
        <div className="h-5 w-32 bg-slate-200 dark:bg-zinc-800 rounded-md" />
        <div className="h-8 w-64 bg-slate-200 dark:bg-zinc-800 rounded-lg" />
        <div className="h-4 w-full max-w-96 bg-slate-200 dark:bg-zinc-800 rounded-md" />
      </div>
      <div className="border-t border-slate-200/80 dark:border-zinc-800/80 pt-6 space-y-7">
        {/* Row 1: Title & Company */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div className="space-y-2">
            <div className="h-3 w-20 bg-slate-200 dark:bg-zinc-800 rounded" />
            <div className="h-7 w-full border-b border-slate-200 dark:border-zinc-800" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-24 bg-slate-200 dark:bg-zinc-800 rounded" />
            <div className="h-7 w-full border-b border-slate-200 dark:border-zinc-800" />
          </div>
        </div>
        {/* Row 2: Location & Workplace */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div className="space-y-2">
            <div className="h-3 w-28 bg-slate-200 dark:bg-zinc-800 rounded" />
            <div className="h-7 w-full border-b border-slate-200 dark:border-zinc-800" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-24 bg-slate-200 dark:bg-zinc-800 rounded" />
            <div className="h-7 w-full border-b border-slate-200 dark:border-zinc-800" />
          </div>
        </div>
        {/* Row 3: URL & Salary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div className="space-y-2">
            <div className="h-3 w-24 bg-slate-200 dark:bg-zinc-800 rounded" />
            <div className="h-7 w-full border-b border-slate-200 dark:border-zinc-800" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-28 bg-slate-200 dark:bg-zinc-800 rounded" />
            <div className="h-7 w-full border-b border-slate-200 dark:border-zinc-800" />
          </div>
        </div>
        {/* Row 4: Description */}
        <div className="space-y-2">
          <div className="h-3 w-32 bg-slate-200 dark:bg-zinc-800 rounded" />
          <div className="h-10 w-full border-b border-slate-200 dark:border-zinc-800" />
        </div>
        {/* Row 5: Submit button */}
        <div className="pt-4 flex justify-end">
          <div className="h-10 w-36 bg-slate-200 dark:bg-zinc-800 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
