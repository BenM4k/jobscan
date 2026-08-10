"use client";

import React, { useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { triggerJobFetchAction, triggerDrcCrawlAction } from "@/actions/job.actions";

type FetchSource = "remoteok" | "drc" | "greenhouse" | "lever" | "ashby";

interface FetchJobsPopoverProps {
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export function FetchJobsPopover({ onSuccess, onError }: FetchJobsPopoverProps) {
  const [selectedSource, setSelectedSource] = useState<FetchSource>("remoteok");
  const [queryInput, setQueryInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const isKeywordSource = selectedSource === "remoteok" || selectedSource === "drc";

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
          onSuccess(`DRC Job Crawl complete! ${total} job(s) updated in pipeline.`);
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
          onError(res.error || `Failed to fetch jobs from ${selectedSource.toUpperCase()}.`);
        } else {
          const total = Array.isArray(res.data) ? res.data.length : 1;
          onSuccess(`Successfully fetched jobs from ${selectedSource.toUpperCase()}! ${total} job(s) updated.`);
          setIsOpen(false);
          setTimeout(() => window.location.reload(), 1200);
        }
      }
    } catch (err: any) {
      setIsLoading(false);
      onError(err.message || "Failed to fetch jobs.");
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        disabled={isLoading}
        aria-label="Fetch or Crawl New Job Postings"
        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition shadow-md shadow-emerald-600/20 inline-flex items-center gap-1.5 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer"
      >
        {isLoading ? (
          <>
            <span aria-hidden="true" className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>Fetching Opportunities...</span>
          </>
        ) : (
          <>
            <span aria-hidden="true">🌐</span>
            <span>Fetch Jobs</span>
            <span className="text-[10px] opacity-75" aria-hidden="true">▾</span>
          </>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-80 sm:w-96 p-4 bg-white dark:bg-[#121215] border border-slate-300 dark:border-zinc-800 rounded-2xl shadow-xl space-y-4"
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-zinc-800/80">
          <div>
            <h4 className="text-xs font-bold text-gray-900 dark:text-slate-100 uppercase tracking-wider">
              Fetch New Job Listings
            </h4>
            <p className="text-[11px] text-gray-500 dark:text-zinc-400">
              Select platform source and search parameter.
            </p>
          </div>
        </div>

        {/* Source Selector Buttons */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => {
              setSelectedSource("remoteok");
              setQueryInput("");
            }}
            className={`p-2 rounded-xl text-xs font-semibold border transition text-left flex flex-col gap-0.5 cursor-pointer ${
              selectedSource === "remoteok"
                ? "bg-blue-50 dark:bg-blue-950/50 border-blue-500 text-blue-700 dark:text-blue-300 font-bold"
                : "border-slate-300 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/60 text-gray-800 dark:text-zinc-300"
            }`}
          >
            <span>🌐 RemoteOK</span>
            <span className="text-[9px] opacity-70 font-normal">Keyword Filter</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedSource("drc");
              setQueryInput("");
            }}
            className={`p-2 rounded-xl text-xs font-semibold border transition text-left flex flex-col gap-0.5 cursor-pointer ${
              selectedSource === "drc"
                ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold"
                : "border-slate-300 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/60 text-gray-800 dark:text-zinc-300"
            }`}
          >
            <span>🇨🇩 DRC Local</span>
            <span className="text-[9px] opacity-70 font-normal">Keyword Filter</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedSource("greenhouse");
              setQueryInput("");
            }}
            className={`p-2 rounded-xl text-xs font-semibold border transition text-left flex flex-col gap-0.5 cursor-pointer ${
              selectedSource === "greenhouse"
                ? "bg-amber-50 dark:bg-amber-950/50 border-amber-500 text-amber-700 dark:text-amber-300 font-bold"
                : "border-slate-300 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/60 text-gray-800 dark:text-zinc-300"
            }`}
          >
            <span>🌿 Greenhouse</span>
            <span className="text-[9px] opacity-70 font-normal">Company Board</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedSource("lever");
              setQueryInput("");
            }}
            className={`p-2 rounded-xl text-xs font-semibold border transition text-left flex flex-col gap-0.5 cursor-pointer ${
              selectedSource === "lever"
                ? "bg-purple-50 dark:bg-purple-950/50 border-purple-500 text-purple-700 dark:text-purple-300 font-bold"
                : "border-slate-300 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/60 text-gray-800 dark:text-zinc-300"
            }`}
          >
            <span>⚡ Lever</span>
            <span className="text-[9px] opacity-70 font-normal">Company Board</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedSource("ashby");
              setQueryInput("");
            }}
            className={`p-2 rounded-xl text-xs font-semibold border transition text-left flex flex-col gap-0.5 col-span-2 cursor-pointer ${
              selectedSource === "ashby"
                ? "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold"
                : "border-slate-300 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/60 text-gray-800 dark:text-zinc-300"
            }`}
          >
            <span>🚀 Ashby</span>
            <span className="text-[9px] opacity-70 font-normal">Company Board</span>
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleFetch} className="space-y-3 pt-1">
          <div>
            <label
              htmlFor="fetch-query-input"
              className="block text-xs font-semibold text-gray-800 dark:text-zinc-200 mb-1"
            >
              {isKeywordSource ? "Job Field / Skill Keyword" : "Company Board Slug / ID"}
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
              className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 text-gray-900 dark:text-slate-100 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 transition"
            />
          </div>

          {/* Hint / Warning Info Block */}
          {isKeywordSource ? (
            <div className="p-3 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 rounded-xl text-[11px] text-blue-700 dark:text-blue-300 space-y-1">
              <span className="font-bold flex items-center gap-1">
                💡 Keyword Search Allowed
              </span>
              <p className="leading-normal">
                {selectedSource === "remoteok"
                  ? "RemoteOK supports filtering listings by specific field or skill tags (e.g., 'software developer', 'dev', 'python')."
                  : "DRC local sources match postings matching your skill or field search query."}
              </p>
            </div>
          ) : (
            <div className="p-3 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
              <span className="font-bold flex items-center gap-1">
                ⚠️ Company Board Slug Required
              </span>
              <p className="leading-normal">
                ATS platforms ({selectedSource.toUpperCase()}) do not support generic role searches. Enter the exact company board ID from their portal URL (e.g. greenhouse.io/<strong>vercel</strong> -&gt; vercel).
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2.5 rounded-xl transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {isLoading ? "Fetching Jobs..." : `Fetch ${selectedSource.toUpperCase()} Jobs`}
          </button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
