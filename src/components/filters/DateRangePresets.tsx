import React from "react";
import { useTranslations } from "next-intl";

interface DateRangePresetsProps {
  isFiltered: boolean;
  onSelectPreset: (days?: number) => void;
}

export function DateRangePresets({
  isFiltered,
  onSelectPreset,
}: DateRangePresetsProps) {
  const t = useTranslations("dashboard");

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <button
        type="button"
        onClick={() => onSelectPreset(undefined)}
        className={`px-3.5 py-2.5 sm:py-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer text-center ${
          !isFiltered
            ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
            : "border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300"
        }`}
      >
        {t("allTime")}
      </button>
      <button
        type="button"
        onClick={() => onSelectPreset(1)}
        className="px-3.5 py-2.5 sm:py-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs sm:text-sm text-slate-700 dark:text-zinc-300 font-semibold transition-all cursor-pointer text-center"
      >
        {t("last24h")}
      </button>
      <button
        type="button"
        onClick={() => onSelectPreset(7)}
        className="px-3.5 py-2.5 sm:py-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs sm:text-sm text-slate-700 dark:text-zinc-300 font-semibold transition-all cursor-pointer text-center"
      >
        {t("last7Days")}
      </button>
      <button
        type="button"
        onClick={() => onSelectPreset(30)}
        className="px-3.5 py-2.5 sm:py-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs sm:text-sm text-slate-700 dark:text-zinc-300 font-semibold transition-all cursor-pointer text-center"
      >
        {t("last30Days")}
      </button>
    </div>
  );
}
