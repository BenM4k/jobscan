"use client";

import React, { useState } from "react";
import { useQueryState, parseAsString, parseAsStringEnum } from "nuqs";
import { pipelineStatusEnum } from "@/services/db/schema";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { useTranslations } from "next-intl";
import { Search, X, RotateCcw, Loader2 } from "lucide-react";
import {
  SOURCE_OPTIONS,
  STATUS_OPTIONS,
  type SourceOption,
  type StatusOption,
} from "./filters/filter-options";
import { FilterSelect } from "./filters/FilterSelect";
import { useFilterTransition } from "./filters/FilterTransitionContext";

export { FilterBarSkeleton } from "./filters/FilterBarSkeleton";

export function FilterBar() {
  const t = useTranslations("dashboard");
  const { isPending, startTransition } = useFilterTransition();

  const [searchQuery, setSearchQuery] = useQueryState(
    "q",
    parseAsString.withDefault("").withOptions({ shallow: false }),
  );
  const [inputValue, setInputValue] = useState(searchQuery);
  const [prevSearchQuery, setPrevSearchQuery] = useState(searchQuery);

  if (prevSearchQuery !== searchQuery) {
    setPrevSearchQuery(searchQuery);
    setInputValue(searchQuery);
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(inputValue.trim() || "", {
      startTransition,
      shallow: false,
    });
  };

  const handleClearSearch = () => {
    setInputValue("");
    setSearchQuery("", { startTransition, shallow: false });
  };

  const [statusFilter, setStatusFilter] = useQueryState(
    "status",
    parseAsStringEnum<StatusOption>(["all", ...pipelineStatusEnum.enumValues])
      .withDefault("all")
      .withOptions({ shallow: false }),
  );

  const [sourceFilter, setSourceFilter] = useQueryState(
    "source",
    parseAsStringEnum<SourceOption>([
      "all",
      "reliefweb",
      "emploicd",
      "congojob",
      "unjobs",
      "greenhouse",
      "remoteok",
      "lever",
      "ashby",
      "manual",
    ])
      .withDefault("all")
      .withOptions({ shallow: false }),
  );

  const [startDate, setStartDate] = useQueryState(
    "startDate",
    parseAsString.withDefault("").withOptions({ shallow: false }),
  );
  const [endDate, setEndDate] = useQueryState(
    "endDate",
    parseAsString.withDefault("").withOptions({ shallow: false }),
  );

  const isSourceActive = sourceFilter !== "all";
  const isStatusActive = statusFilter !== "all";
  const isDateActive = Boolean(startDate || endDate);
  const isSearchActive = Boolean(searchQuery && searchQuery.trim().length > 0);
  const hasActiveFilters =
    isSourceActive || isStatusActive || isDateActive || isSearchActive;

  const handleResetAll = () => {
    setInputValue("");
    setSearchQuery("", { startTransition, shallow: false });
    setStatusFilter("all", { startTransition, shallow: false });
    setSourceFilter("all", { startTransition, shallow: false });
    setStartDate(null, { startTransition, shallow: false });
    setEndDate(null, { startTransition, shallow: false });
  };

  const statusDropdownOptions = STATUS_OPTIONS.map((opt) => {
    const raw = t(opt.key);
    const label = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
    return { value: opt.value, label };
  });

  return (
    <div className="p-2 sm:p-2.5 rounded-2xl bg-slate-100/70 dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80 shadow-2xs">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
        {/* Search Input with embedded icon button */}
        <form
          onSubmit={handleSearchSubmit}
          className="relative flex-1 min-w-60"
        >
          <input
            id="job-search-input"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            className="w-full h-11 pl-4 pr-20 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
          />
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {inputValue && !isPending && (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label={t("clearFilter")}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer p-1 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
              >
                <X className="size-3.5" />
              </button>
            )}
            <button
              type="submit"
              disabled={isPending}
              aria-label={t("searchPlaceholder")}
              className="size-8 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/70 text-white flex items-center justify-center transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin text-white" />
              ) : (
                <Search className="size-4" />
              )}
            </button>
          </div>
        </form>

        {/* Filter Controls Group - Symmetrical, uniform h-11 selects */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap sm:flex-nowrap">
          <FilterSelect
            value={sourceFilter}
            onChange={(val) =>
              setSourceFilter(val as SourceOption, {
                startTransition,
                shallow: false,
              })
            }
            options={SOURCE_OPTIONS}
            ariaLabel={t("sourceAll")}
            allLabel={t("sourceAll")}
            isActive={isSourceActive}
            prefix={t("sourceAll").split(/[:：]/)[0].trim()}
            minWidthClass="min-w-[150px]"
          />

          <FilterSelect
            value={statusFilter}
            onChange={(val) =>
              setStatusFilter(val as StatusOption, {
                startTransition,
                shallow: false,
              })
            }
            options={statusDropdownOptions}
            ariaLabel={t("statusAll")}
            allLabel={t("statusAll")}
            isActive={isStatusActive}
            prefix={t("status")}
            minWidthClass="min-w-[145px]"
          />

          <div className="w-full sm:w-auto flex-1 sm:flex-initial">
            <DateRangeFilter />
          </div>

          {/* Reset All Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetAll}
              disabled={isPending}
              aria-label={t("clearFilter")}
              className="h-11 px-3.5 rounded-xl border border-dashed border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-300 dark:hover:border-rose-800 text-slate-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer shrink-0 disabled:opacity-50"
            >
              <RotateCcw
                className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">{t("clearFilter")}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
