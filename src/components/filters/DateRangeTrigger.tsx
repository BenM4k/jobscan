import React from "react";
import { PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ChevronDown } from "lucide-react";

interface DateRangeTriggerProps {
  isFiltered: boolean;
  displayTitle: string;
  displayValue: string;
  ariaLabel: string;
}

export function DateRangeTrigger({
  isFiltered,
  displayTitle,
  displayValue,
  ariaLabel,
}: DateRangeTriggerProps) {
  return (
    <PopoverTrigger
      aria-label={ariaLabel}
      className={`group h-11 sm:h-12 w-full sm:w-auto rounded-xl px-3.5 py-1.5 transition-all cursor-pointer border focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 flex items-center justify-between gap-2.5 shadow-2xs text-left ${
        isFiltered
          ? "bg-blue-50/90 dark:bg-blue-950/60 border-blue-400 dark:border-blue-700 ring-1 ring-blue-500/20"
          : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700"
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div
          className={`size-8 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
            isFiltered
              ? "bg-blue-600 text-white shadow-2xs"
              : "bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 group-hover:bg-slate-200 dark:group-hover:bg-zinc-700"
          }`}
        >
          <CalendarIcon className="size-4" />
        </div>

        <div className="flex flex-col justify-center leading-tight min-w-0 flex-1">
          <span
            className={`text-[10px] font-bold uppercase tracking-wider ${
              isFiltered
                ? "text-blue-600 dark:text-blue-400"
                : "text-slate-400 dark:text-zinc-500"
            }`}
          >
            {displayTitle}
          </span>
          <span
            className={`text-xs sm:text-sm font-bold truncate ${
              isFiltered
                ? "text-blue-950 dark:text-blue-100"
                : "text-slate-800 dark:text-zinc-200"
            }`}
          >
            {displayValue}
          </span>
        </div>
      </div>

      <ChevronDown
        className={`size-4 shrink-0 transition-colors ml-1 ${
          isFiltered
            ? "text-blue-600 dark:text-blue-400"
            : "text-slate-400 dark:text-zinc-500"
        }`}
        aria-hidden="true"
      />
    </PopoverTrigger>
  );
}
