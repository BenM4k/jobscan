"use client";

import React from "react";
import { JobSelect } from "@/dal/jobs.dal";
import { JobStatus } from "@/services/db/schema";
import { CardGridSelect } from "@/components/ui/card-grid-select";

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

export function JobDetailHeader({ job, onStatusChange }: JobDetailHeaderProps) {
  const companyInitials = getCompanyInitials(job.company);

  return (
    <header className="bg-white dark:bg-[#121215] border border-slate-300 dark:border-zinc-800 p-6 sm:p-8 rounded-3xl shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
        <div className="flex items-start gap-4 sm:gap-5">
          <div
            aria-hidden="true"
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-linear-to-br from-slate-100 to-slate-200 dark:from-[#1C1C22] dark:to-[#16161B] border border-slate-300 dark:border-zinc-700/60 text-gray-900 dark:text-slate-100 font-extrabold flex items-center justify-center text-base sm:text-lg shrink-0 font-sans tracking-wider shadow-xs"
          >
            {companyInitials}
          </div>

          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-800">
                {job.status}
              </span>
              <span className="text-xs text-gray-500 dark:text-zinc-400">via {job.source}</span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900 dark:text-slate-100 leading-tight">
              {job.title}
            </h1>

            <p className="text-sm sm:text-base font-bold text-gray-600 dark:text-zinc-300">
              {job.company}
            </p>
          </div>
        </div>

        <a
          href={job.url}
          target="_blank"
          rel="noreferrer"
          className="w-full sm:w-auto text-center bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold px-5 py-3 rounded-xl transition shadow-md shadow-blue-500/20 shrink-0 inline-flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>Apply on Job Board</span>
          <span>↗</span>
        </a>
      </div>

      {/* Metadata Tags & Status Changer Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-zinc-800/80">
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 text-xs text-gray-600 dark:text-zinc-400 font-medium">
          {(job.city || job.country || job.countryCode) && (
            <span className="bg-gray-100 dark:bg-zinc-800/70 text-gray-700 dark:text-zinc-300 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-zinc-700/60">
              📍 {[job.city, job.countryCode ? job.countryCode : job.country].filter(Boolean).join(", ")}
            </span>
          )}

          {job.workplaceType && (
            <span
              className={`text-[11px] font-bold uppercase px-2.5 py-1 rounded-lg border ${
                job.workplaceType === "remote"
                  ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                  : job.workplaceType === "hybrid"
                  ? "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                  : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
              }`}
            >
              {job.workplaceType === "remote"
                ? "🌐 Remote"
                : job.workplaceType === "hybrid"
                ? "⚡ Hybrid"
                : "🏢 On-site"}
            </span>
          )}

          {job.postedAt && (
            <span className="bg-gray-100 dark:bg-zinc-800/70 text-gray-600 dark:text-zinc-400 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-zinc-700/60">
              📅 Posted {new Date(job.postedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          )}

          {Array.isArray(job.remoteRegions) && job.remoteRegions.length > 0 && (
            <span className="text-[11px] font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800">
              🌍 {job.remoteRegions.join(", ")}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <CardGridSelect
            title="Pipeline Status"
            value={job.status}
            options={[
              { id: "new", label: "NEW" },
              { id: "scored", label: "SCORED" },
              { id: "applied", label: "APPLIED" },
              { id: "interviewing", label: "INT" },
              { id: "rejected", label: "REJ" },
              { id: "offer", label: "OFFER" },
            ]}
            onChange={(val) => onStatusChange(val as JobStatus)}
            accentColor="blue"
          />
        </div>
      </div>
    </header>
  );
}
