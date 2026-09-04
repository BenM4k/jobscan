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
import posthog from "posthog-js";
import {
  SourceSelectorGrid,
  FetchSource,
} from "@/components/job/SourceSelectorGrid";
import { FetchQueryInput } from "@/components/job/FetchQueryInput";

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
          posthog.capture("jobs_fetched", {
            source: selectedSource,
            jobs_upserted: total,
          });
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
          posthog.capture("jobs_fetched", {
            source: selectedSource,
            jobs_upserted: total,
          });
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
        className="w-[92vw] sm:w-120 p-6 sm:p-7 bg-white dark:bg-[#121215] border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl space-y-6"
      >
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

        <SourceSelectorGrid
          selectedSource={selectedSource}
          onSelectSource={(s) => {
            setSelectedSource(s);
            setQueryInput("");
          }}
        />

        <form onSubmit={handleFetch} className="space-y-6">
          <FetchQueryInput
            isKeywordSource={isKeywordSource}
            queryInput={queryInput}
            onQueryChange={setQueryInput}
          />

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
