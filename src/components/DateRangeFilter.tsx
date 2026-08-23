"use client";

import React, { useState } from "react";
import { useQueryState, parseAsString } from "nuqs";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useTranslations } from "next-intl";

function formatDateToInput(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function DateRangeFilter() {
  const t = useTranslations("dashboard");
  const [startDate, setStartDate] = useQueryState(
    "startDate",
    parseAsString.withDefault(""),
  );
  const [endDate, setEndDate] = useQueryState(
    "endDate",
    parseAsString.withDefault(""),
  );

  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);

  const handleApplyCustom = () => {
    setStartDate(tempStart || null, { shallow: false });
    setEndDate(tempEnd || null, { shallow: false });
  };

  const handlePreset = (days?: number) => {
    if (!days) {
      setTempStart("");
      setTempEnd("");
      setStartDate(null, { shallow: false });
      setEndDate(null, { shallow: false });
      return;
    }

    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - days);

    const startStr = formatDateToInput(past);
    const endStr = formatDateToInput(today);

    setTempStart(startStr);
    setTempEnd(endStr);
    setStartDate(startStr, { shallow: false });
    setEndDate(endStr, { shallow: false });
  };

  // Compute label text for trigger pill
  let label = t("dateRangeAll");
  if (startDate && endDate) {
    label = `Date: ${startDate} - ${endDate}`;
  } else if (startDate) {
    label = `Date: ≥ ${startDate}`;
  } else if (endDate) {
    label = `Date: ≤ ${endDate}`;
  }

  const isFiltered = Boolean(startDate || endDate);

  return (
    <Popover>
      <PopoverTrigger
        aria-label={t("filterByDate")}
        className={`appearance-none bg-white dark:bg-[#18181B] border ${
          isFiltered
            ? "border-blue-500 text-blue-600 dark:text-blue-400 font-medium"
            : "border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 font-medium"
        } rounded-xl px-3.5 py-1.5 sm:px-4 sm:py-2 hover:border-slate-300 dark:hover:border-zinc-700 transition cursor-pointer text-xs focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 flex items-center gap-1`}
      >
        <span className="truncate max-w-[160px] sm:max-w-[200px]">{label}</span>
        <span className="text-[10px] text-gray-400 dark:text-zinc-500 ml-0.5" aria-hidden="true">
          ▾
        </span>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-72 p-4 bg-white dark:bg-[#121215] border border-slate-300 dark:border-zinc-800 rounded-2xl shadow-xl space-y-4"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-900 dark:text-slate-100 uppercase tracking-wider">
            {t("filterByDate")}
          </span>
          {isFiltered && (
            <button
              onClick={() => handlePreset(undefined)}
              className="text-[11px] text-rose-500 hover:text-rose-600 font-medium cursor-pointer"
            >
              {t("clearFilter")}
            </button>
          )}
        </div>

        {/* Presets */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => handlePreset(undefined)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs text-gray-800 dark:text-zinc-300 font-medium transition cursor-pointer"
          >
            {t("allTime")}
          </button>
          <button
            onClick={() => handlePreset(1)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs text-gray-800 dark:text-zinc-300 font-medium transition cursor-pointer"
          >
            {t("last24h")}
          </button>
          <button
            onClick={() => handlePreset(7)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs text-gray-800 dark:text-zinc-300 font-medium transition cursor-pointer"
          >
            {t("last7Days")}
          </button>
          <button
            onClick={() => handlePreset(30)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs text-gray-800 dark:text-zinc-300 font-medium transition cursor-pointer"
          >
            {t("last30Days")}
          </button>
        </div>

        {/* Custom Range */}
        <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-zinc-800">
          <span className="text-[11px] text-gray-500 dark:text-zinc-500 font-semibold block">
            {t("customRange")}
          </span>
          <div className="space-y-2">
            <div>
              <label
                htmlFor="start-date-input"
                className="text-[10px] text-gray-600 dark:text-zinc-400 font-medium block mb-1"
              >
                {t("startDate")}
              </label>
              <input
                id="start-date-input"
                type="date"
                value={tempStart}
                onChange={(e) => setTempStart(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 text-gray-900 dark:text-slate-100 text-xs rounded-xl p-2 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label
                htmlFor="end-date-input"
                className="text-[10px] text-gray-600 dark:text-zinc-400 font-medium block mb-1"
              >
                {t("endDate")}
              </label>
              <input
                id="end-date-input"
                type="date"
                value={tempEnd}
                onChange={(e) => setTempEnd(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 text-gray-900 dark:text-slate-100 text-xs rounded-xl p-2 focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={handleApplyCustom}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 rounded-xl transition shadow-xs cursor-pointer"
            >
              {t("applyRange")}
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
