"use client";

import React, { useState } from "react";
import { useQueryState, parseAsString } from "nuqs";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useTranslations, useLocale } from "next-intl";
import { RotateCcw } from "lucide-react";
import type { DateRange } from "react-day-picker";
import {
  formatDateToInput,
  parseDateInput,
  formatShortDate,
  getDateFilterBounds,
} from "./filters/date-filter-utils";
import { DateRangeDisplayCard } from "./filters/DateRangeDisplayCard";
import { DateRangePresets } from "./filters/DateRangePresets";
import { DateRangeTrigger } from "./filters/DateRangeTrigger";
import { useFilterTransition } from "./filters/FilterTransitionContext";

export function DateRangeFilter() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const { startTransition } = useFilterTransition();

  const [startDate, setStartDate] = useQueryState(
    "startDate",
    parseAsString.withDefault("").withOptions({ shallow: false }),
  );
  const [endDate, setEndDate] = useQueryState(
    "endDate",
    parseAsString.withDefault("").withOptions({ shallow: false }),
  );

  const [isOpen, setIsOpen] = useState(false);

  const [tempRange, setTempRange] = useState<DateRange | undefined>(() => ({
    from: parseDateInput(startDate),
    to: parseDateInput(endDate),
  }));

  const { endOfToday, minAllowedDate } = getDateFilterBounds();

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setTempRange({
        from: parseDateInput(startDate),
        to: parseDateInput(endDate),
      });
    }
  };

  const handleApply = () => {
    setStartDate(tempRange?.from ? formatDateToInput(tempRange.from) : null, {
      startTransition,
      shallow: false,
    });
    setEndDate(tempRange?.to ? formatDateToInput(tempRange.to) : null, {
      startTransition,
      shallow: false,
    });
    setIsOpen(false);
  };

  const handleClear = () => {
    setTempRange(undefined);
    setStartDate(null, { startTransition, shallow: false });
    setEndDate(null, { startTransition, shallow: false });
    setIsOpen(false);
  };

  const handlePreset = (days?: number) => {
    if (!days) {
      handleClear();
      return;
    }
    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - days);

    const clampedPast = past < minAllowedDate ? minAllowedDate : past;

    const range = { from: clampedPast, to: today };
    setTempRange(range);
    setStartDate(formatDateToInput(clampedPast), {
      startTransition,
      shallow: false,
    });
    setEndDate(formatDateToInput(today), { startTransition, shallow: false });
    setIsOpen(false);
  };

  const fromDate = parseDateInput(startDate);
  const toDate = parseDateInput(endDate);
  const isFiltered = Boolean(startDate || endDate);

  let displayTitle = t("filterByDate");
  let displayValue = t("allTime");
  if (fromDate && toDate) {
    displayTitle = t("customRange");
    displayValue = `${formatShortDate(fromDate, locale)} – ${formatShortDate(toDate, locale)}`;
  } else if (fromDate) {
    displayTitle = t("startDate");
    displayValue = formatShortDate(fromDate, locale);
  } else if (toDate) {
    displayTitle = t("endDate");
    displayValue = formatShortDate(toDate, locale);
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <DateRangeTrigger
        isFiltered={isFiltered}
        displayTitle={displayTitle}
        displayValue={displayValue}
        ariaLabel={t("filterByDate")}
      />

      <PopoverContent
        align="start"
        className="w-[calc(100vw-2rem)] sm:w-auto max-w-97.5 sm:max-w-none p-3.5 sm:p-4 bg-white dark:bg-[#121215] border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl space-y-3.5"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-900 dark:text-slate-100 uppercase tracking-wider">
            {t("filterByDate")}
          </span>
          {isFiltered && (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-rose-500 hover:text-rose-600 font-semibold cursor-pointer flex items-center gap-1 transition"
            >
              <RotateCcw className="size-3" />
              <span>{t("clearFilter")}</span>
            </button>
          )}
        </div>

        {/* Noticeable Date Displays Card */}
        <DateRangeDisplayCard from={tempRange?.from} to={tempRange?.to} />

        {/* Presets with generous padding */}
        <DateRangePresets
          isFiltered={isFiltered}
          onSelectPreset={handlePreset}
        />

        {/* shadcn Calendar with year blocked to current year & max 3 months back */}
        <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden p-1 flex justify-center bg-slate-50/50 dark:bg-zinc-950/40 w-full">
          <Calendar
            mode="range"
            selected={tempRange}
            onSelect={setTempRange}
            disabled={[{ after: endOfToday }, { before: minAllowedDate }]}
            startMonth={minAllowedDate}
            endMonth={endOfToday}
            numberOfMonths={1}
            captionLayout="label"
          />
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer text-center"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!tempRange?.from}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition shadow-xs cursor-pointer text-center"
          >
            {t("applyRange")}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
