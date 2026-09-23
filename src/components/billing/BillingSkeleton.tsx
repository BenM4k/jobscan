import React from "react";

export function BillingSkeleton() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto py-6 px-4 animate-pulse">
      {/* Header Banner Skeleton */}
      <div className="h-32 rounded-2xl bg-slate-200 dark:bg-zinc-800/60" />

      {/* Grid Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-72 rounded-2xl bg-slate-100 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-800" />
        <div className="h-72 rounded-2xl bg-slate-100 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-800" />
      </div>

      {/* Ledger Skeleton */}
      <div className="h-64 rounded-2xl bg-slate-100 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-800" />
    </div>
  );
}
