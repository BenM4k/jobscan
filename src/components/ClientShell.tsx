"use client";

import React, { useState, Suspense } from "react";
import { useQueryState, parseAsStringEnum } from "nuqs";
import { JobStatus, jobStatusEnum } from "@/services/db/schema";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { FetchJobsPopover } from "@/components/FetchJobsPopover";

interface ClientShellProps {
  children: React.ReactNode;
}

type Source =
  | "greenhouse"
  | "remoteok"
  | "lever"
  | "ashby"
  | "reliefweb"
  | "emploicd"
  | "congojob"
  | "unjobs"
  | "manual";

type SourceOption = "all" | Source;
type StatusOption = "all" | JobStatus;

function LocalJobsButton() {
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
    ]).withDefault("all"),
  );

  return (
    <button
      onClick={() => setSourceFilter("all")}
      className={`font-medium text-xs px-3.5 py-2 rounded-xl border shadow-xs flex items-center gap-1.5 transition ${
        sourceFilter === "all" ||
        sourceFilter === "reliefweb" ||
        sourceFilter === "emploicd" ||
        sourceFilter === "congojob"
          ? "bg-white dark:bg-[#18181B] text-gray-900 dark:text-slate-100 border-slate-400 dark:border-zinc-800"
          : "bg-transparent text-gray-700 dark:text-zinc-400 border-slate-300 dark:border-zinc-800/80 hover:border-slate-400 dark:hover:border-zinc-700"
      }`}
    >
      <span aria-hidden="true">📍</span>
      <span>Local Jobs (DRC)</span>
    </button>
  );
}

function FilterBar() {
  const [statusFilter, setStatusFilter] = useQueryState(
    "status",
    parseAsStringEnum<StatusOption>(["all", ...jobStatusEnum]).withDefault(
      "all",
    ),
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
    ]).withDefault("all"),
  );

  return (
    <div className="flex flex-wrap items-center gap-3 sm:gap-3.5 text-xs sm:text-sm font-medium pt-1">
      {/* Source Dropdown Filter Pill */}
      <div className="relative">
        <select
          value={sourceFilter}
          onChange={(e) =>
            setSourceFilter(e.target.value as SourceOption, { shallow: false })
          }
          aria-label="Filter jobs by source platform"
          className="appearance-none bg-white dark:bg-[#18181B] border border-slate-300 dark:border-zinc-800 text-gray-800 dark:text-zinc-300 rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3 pr-8 hover:border-slate-400 dark:hover:border-zinc-700 transition cursor-pointer text-xs sm:text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 font-semibold shadow-xs"
        >
          <option value="all">Source: All</option>
          <option value="reliefweb">🇨🇩 ReliefWeb</option>
          <option value="emploicd">🇨🇩 Emploi.cd</option>
          <option value="congojob">🇨🇩 CongoJob</option>
          <option value="unjobs">🇨🇩 UNJobs</option>
          <option value="greenhouse">Greenhouse</option>
          <option value="ashby">Ashby</option>
          <option value="lever">Lever</option>
          <option value="remoteok">RemoteOK</option>
        </select>
        <span
          className="absolute right-3 top-3 sm:top-3.5 pointer-events-none text-xs text-gray-400 dark:text-zinc-500"
          aria-hidden="true"
        >
          ▾
        </span>
      </div>

      {/* Status Dropdown Filter Pill */}
      <div className="relative">
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as StatusOption, { shallow: false })
          }
          aria-label="Filter jobs by status"
          className="appearance-none bg-white dark:bg-[#18181B] border border-slate-300 dark:border-zinc-800 text-gray-800 dark:text-zinc-300 rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3 pr-8 hover:border-slate-400 dark:hover:border-zinc-700 transition cursor-pointer text-xs sm:text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 font-semibold shadow-xs"
        >
          <option value="all">Status: All</option>
          <option value="new">NEW</option>
          <option value="scored">SCORED</option>
          <option value="applied">APPLIED</option>
          <option value="interviewing">INTERVIEWING</option>
          <option value="rejected">REJECTED</option>
          <option value="offer">OFFER</option>
        </select>
        <span
          className="absolute right-3 top-3 sm:top-3.5 pointer-events-none text-xs text-gray-400 dark:text-zinc-500"
          aria-hidden="true"
        >
          ▾
        </span>
      </div>

      {/* Date Range Filter */}
      <DateRangeFilter />

      <button
        aria-label="Filter by Country"
        className="bg-white dark:bg-[#18181B] border border-slate-300 dark:border-zinc-800 text-gray-800 dark:text-zinc-300 px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl hover:border-slate-400 dark:hover:border-zinc-700 transition flex items-center gap-1.5 font-semibold shadow-xs"
      >
        <span>Country</span>
        <span
          className="text-xs text-gray-400 dark:text-zinc-500"
          aria-hidden="true"
        >
          ▾
        </span>
      </button>

      <button
        aria-label="Filter by City"
        className="bg-white dark:bg-[#18181B] border border-slate-300 dark:border-zinc-800 text-gray-800 dark:text-zinc-300 px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl hover:border-slate-400 dark:hover:border-zinc-700 transition flex items-center gap-1.5 font-semibold shadow-xs"
      >
        <span>City</span>
        <span
          className="text-xs text-gray-400 dark:text-zinc-500"
          aria-hidden="true"
        >
          ▾
        </span>
      </button>

      <button
        aria-label="Filter by Workplace Type"
        className="bg-white dark:bg-[#18181B] border border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl hover:border-gray-300 dark:hover:border-zinc-700 transition flex items-center gap-1.5 font-semibold shadow-xs"
      >
        <span>Workplace</span>
        <span
          className="text-xs text-gray-400 dark:text-zinc-500"
          aria-hidden="true"
        >
          ▾
        </span>
      </button>
    </div>
  );
}

export function ClientShell({ children }: ClientShellProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Hero Header Section - Synchronous Static Shell */}
      <div className="space-y-4 pt-2">
        <h1 className="text-3xl sm:text-5xl font-serif text-gray-900 dark:text-slate-100 leading-tight tracking-tight font-medium">
          Discover opportunities
          <br className="hidden sm:inline" /> that match your skills
        </h1>
        <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-xl font-sans">
          Find relevant local opportunities first, with access to global
          international opportunities when needed.
        </p>

        {/* Local / Global Opportunities Toggle Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Suspense
            fallback={
              <div className="h-9 w-36 bg-slate-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
            }
          >
            <LocalJobsButton />
          </Suspense>

          <div className="ml-auto">
            <FetchJobsPopover
              onSuccess={(msg) => {
                setSuccessMsg(msg);
                setErrorMsg(null);
              }}
              onError={(msg) => {
                setErrorMsg(msg);
                setSuccessMsg(null);
              }}
            />
          </div>
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          aria-live="polite"
          className="p-4 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200 text-xs font-semibold rounded-2xl flex justify-between items-center shadow-sm"
        >
          <span>⚠️ {errorMsg}</span>
          <button
            onClick={() => setErrorMsg(null)}
            aria-label="Dismiss error message"
            className="text-xs font-bold opacity-75 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div
          role="alert"
          aria-live="polite"
          className="p-4 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-200 text-xs font-semibold rounded-2xl flex justify-between items-center shadow-sm"
        >
          <span>✅ {successMsg}</span>
          <button
            onClick={() => setSuccessMsg(null)}
            aria-label="Dismiss notification message"
            className="text-xs font-bold opacity-75 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Full-width Search & Filter Pills Section */}
      <div className="space-y-4 pt-1">
        {/* Full-width Search Bar - Synchronous Static Shell */}
        <div className="relative">
          <span
            className="absolute inset-y-0 left-4.5 flex items-center text-gray-400 dark:text-zinc-500 text-base"
            aria-hidden="true"
          >
            🔍
          </span>
          <input
            id="job-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search jobs, companies, skills..."
            aria-label="Search jobs by title, company, or skills"
            className="w-full bg-white dark:bg-[#141417] border border-slate-300 dark:border-zinc-800 text-gray-900 dark:text-slate-100 text-sm font-medium rounded-2xl pl-12 pr-5 py-3.5 sm:py-4 focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 transition shadow-xs placeholder-gray-400 dark:placeholder-zinc-500"
          />
        </div>

        {/* Filter Pills Row - Suspense Boundary around URL Readers */}
        <Suspense
          fallback={
            <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
              <div className="w-32 h-10 rounded-2xl bg-slate-200 dark:bg-zinc-800 animate-pulse" />
              <div className="w-32 h-10 rounded-2xl bg-slate-200 dark:bg-zinc-800 animate-pulse" />
              <div className="w-28 h-10 rounded-2xl bg-slate-200 dark:bg-zinc-800 animate-pulse" />
            </div>
          }
        >
          <FilterBar />
        </Suspense>
      </div>

      {/* Rendered Job List */}
      <div>{children}</div>
    </div>
  );
}
