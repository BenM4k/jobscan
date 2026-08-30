"use client";

import React, { useState } from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  triggerJobFetchAction,
  triggerDrcCrawlAction,
} from "@/actions/job.actions";
import { useTranslations } from "next-intl";

type FetchSource = "remoteok" | "drc" | "greenhouse" | "lever" | "ashby";

interface FetchJobsPopoverProps {
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export function FetchJobsPopover({
  onSuccess,
  onError,
}: FetchJobsPopoverProps) {
  const [selectedSource, setSelectedSource] = useState<FetchSource>("remoteok");
  const [queryInput, setQueryInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations("dashboard");

  const isKeywordSource =
    selectedSource === "remoteok" || selectedSource === "drc";

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    onError("");

    try {
      if (selectedSource === "drc") {
        const res = await triggerDrcCrawlAction(queryInput.trim() || undefined);
        setIsLoading(false);
        if (!res.success) {
          onError(res.error || "Failed to crawl DRC local job sources.");
        } else {
          const total = res.data?.totalUpserted || 0;
          onSuccess(
            `DRC Job Crawl complete! ${total} job(s) updated in pipeline.`,
          );
          setIsOpen(false);
          setTimeout(() => window.location.reload(), 1200);
        }
      } else {
        const formData = new FormData();
        formData.append("sourceId", selectedSource);
        if (queryInput.trim()) {
          formData.append("target", queryInput.trim());
        }

        const res = await triggerJobFetchAction(formData);
        setIsLoading(false);
        if (!res.success) {
          onError(
            res.error ||
              `Failed to fetch jobs from ${selectedSource.toUpperCase()}.`,
          );
        } else {
          const total = Array.isArray(res.data) ? res.data.length : 1;
          onSuccess(
            `Successfully fetched jobs from ${selectedSource.toUpperCase()}! ${total} job(s) updated.`,
          );
          setIsOpen(false);
          setTimeout(() => window.location.reload(), 1200);
        }
      }
    } catch (err: unknown) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : "Failed to fetch jobs.";
      onError(msg);
    }
  };

  const sources: Array<{
    id: FetchSource;
    title: string;
    icon: string;
    type: "KEYWORD FILTER" | "COMPANY BOARD";
  }> = [
    { id: "remoteok", title: "RemoteOK", icon: "🌐", type: "KEYWORD FILTER" },
    { id: "drc", title: "DRC Local", icon: "🗺️", type: "KEYWORD FILTER" },
    {
      id: "greenhouse",
      title: "Greenhouse",
      icon: "🌿",
      type: "COMPANY BOARD",
    },
    { id: "lever", title: "Lever", icon: "⚡", type: "COMPANY BOARD" },
    { id: "ashby", title: "Ashby", icon: "🚀", type: "COMPANY BOARD" },
  ];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        disabled={isLoading}
        aria-label={t("fetchJobs")}
        className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-3.5 py-2.5 rounded-lg transition shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
      >
        {isLoading ? (
          <>
            <span
              aria-hidden="true"
              className="w-1.5 h-1.5 rounded-full bg-white animate-ping"
            />
            <span>{t("fetchingJobs")}</span>
          </>
        ) : (
          <>
            <span aria-hidden="true" className="text-xs">
              ⤓
            </span>
            <span>{t("fetchJobs")}</span>
          </>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[92vw] sm:w-[480px] p-6 sm:p-7 bg-white dark:bg-[#121215] border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl space-y-6"
      >
        {/* Module Header */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400" />
            <span className="text-[11px] font-mono font-bold tracking-widest text-blue-600 dark:text-blue-400 uppercase">
              DATA RETRIEVAL MODULE
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">
            {t("fetchPopoverTitle")}
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400">
            {t("fetchPopoverSubtitle")}
          </p>
        </div>

        {/* Source Selector Cards */}
        <div className="space-y-2.5">
          {/* Row 1: 3 cards */}
          <div className="grid grid-cols-3 gap-2.5">
            {sources.slice(0, 3).map((s) => {
              const isSelected = selectedSource === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSelectedSource(s.id);
                    setQueryInput("");
                  }}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all relative cursor-pointer min-h-[82px] ${
                    isSelected
                      ? "border-blue-600 dark:border-blue-500 bg-blue-50/20 dark:bg-blue-950/20 shadow-xs ring-1 ring-blue-600 dark:ring-blue-500"
                      : "border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-[#18181C] hover:border-slate-300 dark:hover:border-zinc-700"
                  }`}
                >
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 absolute top-3 right-3" />
                  )}
                  <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-gray-900 dark:text-slate-100">
                    <span className="text-sm">{s.icon}</span>
                    <span className="truncate">{s.title}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono tracking-wider font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 uppercase inline-block">
                      {s.type}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Row 2: 2 cards */}
          <div className="grid grid-cols-2 gap-2.5">
            {sources.slice(3, 5).map((s) => {
              const isSelected = selectedSource === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSelectedSource(s.id);
                    setQueryInput("");
                  }}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all relative cursor-pointer min-h-[82px] ${
                    isSelected
                      ? "border-blue-600 dark:border-blue-500 bg-blue-50/20 dark:bg-blue-950/20 shadow-xs ring-1 ring-blue-600 dark:ring-blue-500"
                      : "border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-[#18181C] hover:border-slate-300 dark:hover:border-zinc-700"
                  }`}
                >
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 absolute top-3 right-3" />
                  )}
                  <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-gray-900 dark:text-slate-100">
                    <span className="text-sm">{s.icon}</span>
                    <span className="truncate">{s.title}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono tracking-wider font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 uppercase inline-block">
                      {s.type}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Input Form Box */}
        <form onSubmit={handleFetch} className="space-y-6">
          <div className="p-4 bg-slate-50/80 dark:bg-zinc-900/50 rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 space-y-2">
            <label
              htmlFor="fetch-query-input"
              className="flex items-center gap-1.5 text-[10px] font-mono tracking-wider font-bold text-gray-500 dark:text-zinc-400 uppercase"
            >
              <span>🔍</span>
              <span>
                {isKeywordSource
                  ? "TARGET KEYWORD / TAG"
                  : "TARGET COMPANY BOARD TOKEN"}
              </span>
            </label>
            <input
              id="fetch-query-input"
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder={
                isKeywordSource
                  ? "e.g. software developer, react, accountant..."
                  : "e.g. vercel, stripe, figma, airbnb..."
              }
              className="w-full bg-transparent border-b border-slate-300 dark:border-zinc-700 text-gray-900 dark:text-slate-100 text-sm py-1.5 focus:outline-none focus:border-blue-500 transition placeholder:text-gray-400 dark:placeholder:text-zinc-500 font-medium"
            />
            {isKeywordSource && (
              <div className="pt-2 flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] font-medium text-gray-500 dark:text-zinc-400">
                  Quick Fields:
                </span>
                {[
                  "Software",
                  "Finance",
                  "NGO",
                  "Santé",
                  "Logistique",
                  "Mines",
                  "RH",
                ].map((field) => (
                  <button
                    key={field}
                    type="button"
                    onClick={() => setQueryInput(field)}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border transition cursor-pointer ${
                      queryInput.toLowerCase() === field.toLowerCase()
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-white dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:border-blue-400 dark:hover:border-blue-500"
                    }`}
                  >
                    {field}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-800/80">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs font-mono font-bold text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition px-2 py-2 cursor-pointer flex items-center gap-1"
            >
              <span>✕</span>
              <span>CANCEL</span>
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl transition shadow-lg shadow-blue-500/25 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  <span>{t("fetching")}</span>
                </>
              ) : (
                <>
                  <span className="text-sm">🔄</span>
                  <span>Fetch Listings ({selectedSource.toUpperCase()})</span>
                </>
              )}
            </button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
