"use client";

import React, { useState } from "react";
import { JobSelect } from "@/dal/jobs.dal";
import { JobStatus } from "@/services/db/schema";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface JobDetailHeaderProps {
  job: JobSelect;
  onStatusChange: (status: JobStatus) => void;
}

function getCompanyInitials(companyName: string): string {
  if (!companyName) return "CO";
  const words = companyName.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2 && words[0][0] && words[1][0]) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return companyName.trim().slice(0, 2).toUpperCase();
}

const statusOptions: { id: JobStatus; label: string }[] = [
  { id: "new", label: "NEW" },
  { id: "scored", label: "SCORED" },
  { id: "applied", label: "APPLIED" },
  { id: "interviewing", label: "INT" },
  { id: "rejected", label: "REJ" },
  { id: "offer", label: "OFFER" },
];

export function JobDetailHeader({ job, onStatusChange }: JobDetailHeaderProps) {
  const [statusOpen, setStatusOpen] = useState(false);
  const companyInitials = getCompanyInitials(job.company);
  const currentStatusLabel =
    statusOptions.find((o) => o.id === job.status)?.label || job.status.toUpperCase();

  return (
    <header className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        {/* Left Side: Avatar + Details */}
        <div className="flex items-start gap-4">
          <div
            aria-hidden="true"
            className="w-14 h-14 rounded-xl bg-slate-200 dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 font-bold flex items-center justify-center text-sm font-mono shrink-0 shadow-xs"
          >
            {companyInitials}
          </div>

          <div className="space-y-1.5 min-w-0">
            {/* Status & Source Row */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold font-mono uppercase bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded">
                {currentStatusLabel}
              </span>
              <span className="text-xs font-mono text-gray-500 dark:text-zinc-400">
                via {job.source || "remotask"}
              </span>
            </div>

            {/* Job Title */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight">
              {job.title}
            </h1>

            {/* Company */}
            <p className="text-sm font-semibold text-gray-700 dark:text-zinc-300">
              {job.company}
            </p>

            {/* Metadata Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1.5">
              {job.workplaceType && (
                <span className="text-[11px] font-mono font-semibold uppercase px-2 py-0.5 rounded-md bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200/60 dark:border-cyan-800/60 inline-flex items-center gap-1">
                  <span>🌐</span>
                  <span>{job.workplaceType}</span>
                </span>
              )}

              {job.postedAt && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 inline-flex items-center gap-1">
                  <span>📅</span>
                  <span>
                    Posted {new Date(job.postedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </span>
              )}

              {Array.isArray(job.remoteRegions) && job.remoteRegions.length > 0 ? (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 inline-flex items-center gap-1">
                  <span>🟣</span>
                  <span>{job.remoteRegions.join(", ")}</span>
                </span>
              ) : (job.city || job.country || job.countryCode) ? (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 inline-flex items-center gap-1">
                  <span>🟣</span>
                  <span>{[job.city, job.countryCode || job.country].filter(Boolean).join(", ")}</span>
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Right Side: Apply Button & Pipeline Status */}
        <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
          <a
            href={job.url}
            target="_blank"
            rel="noreferrer"
            className="bg-[#3b49df] hover:bg-[#2f3cb3] text-white text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-xl transition shadow-xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Apply on Job Board</span>
            <span aria-hidden="true">↗</span>
          </a>

          {/* Pipeline Status Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-gray-500 dark:text-zinc-400">
              PIPELINE STATUS:
            </span>

            <Popover open={statusOpen} onOpenChange={setStatusOpen}>
              <PopoverTrigger
                aria-label={`Select pipeline status, currently ${currentStatusLabel}`}
                className="font-mono text-xs font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
              >
                <span>{currentStatusLabel}</span>
                <span className="text-[10px] text-gray-400 dark:text-zinc-500">⌄</span>
              </PopoverTrigger>

              <PopoverContent
                align="end"
                className="w-56 p-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-lg"
              >
                <div className="grid grid-cols-2 gap-1">
                  {statusOptions.map((opt) => {
                    const active = job.status === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => {
                          onStatusChange(opt.id);
                          setStatusOpen(false);
                        }}
                        className={`p-1.5 rounded-lg text-xs font-mono font-bold transition text-center cursor-pointer ${
                          active
                            ? "bg-indigo-600 text-white"
                            : "hover:bg-slate-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </header>
  );
}
