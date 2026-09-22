import React from "react";
import { formatDisplayDate } from "./date-filter-utils";

interface DateRangeDisplayCardProps {
  from?: Date;
  to?: Date;
}

export function DateRangeDisplayCard({ from, to }: DateRangeDisplayCardProps) {
  const hasSelection = Boolean(from || to);

  return (
    <div
      className={`grid grid-cols-2 gap-2.5 p-3 rounded-xl border transition-colors ${
        hasSelection
          ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/80 dark:border-blue-900/60"
          : "bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800"
      }`}
    >
      <div className="space-y-0.5">
        <span
          className={`text-[10px] font-bold uppercase tracking-wider ${
            from
              ? "text-blue-600 dark:text-blue-400"
              : "text-slate-400 dark:text-zinc-500"
          }`}
        >
          From Date
        </span>
        <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
          {from ? formatDisplayDate(from) : "Not selected"}
        </div>
      </div>

      <div className="space-y-0.5 border-l border-slate-200 dark:border-zinc-800 pl-3">
        <span
          className={`text-[10px] font-bold uppercase tracking-wider ${
            to
              ? "text-blue-600 dark:text-blue-400"
              : "text-slate-400 dark:text-zinc-500"
          }`}
        >
          To Date
        </span>
        <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
          {to ? formatDisplayDate(to) : "Not selected"}
        </div>
      </div>
    </div>
  );
}
