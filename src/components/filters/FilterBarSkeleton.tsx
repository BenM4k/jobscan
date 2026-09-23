import React from "react";

export function FilterBarSkeleton() {
  return (
    <div className="p-2 sm:p-2.5 rounded-2xl bg-slate-100/70 dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80 shadow-2xs">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
        <div className="flex-1 h-11 rounded-xl bg-slate-200/70 dark:bg-zinc-800/70 animate-pulse" />
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <div className="flex-1 sm:w-36 h-11 rounded-xl bg-slate-200/70 dark:bg-zinc-800/70 animate-pulse" />
          <div className="flex-1 sm:w-36 h-11 rounded-xl bg-slate-200/70 dark:bg-zinc-800/70 animate-pulse" />
          <div className="w-full sm:w-44 h-11 rounded-xl bg-slate-200/70 dark:bg-zinc-800/70 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
