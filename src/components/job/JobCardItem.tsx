"use client";

import React, { useState } from "react";
import { JobSelect } from "@/dal/jobs.dal";
import { JobStatus } from "@/services/db/schema";
import { getScoreBadgeStyle } from "@/lib/score-style";
import { CardGridSelect } from "@/components/ui/card-grid-select";

type AIProvider = "claude" | "gemini" | "openai";

interface JobCardItemProps {
  job: JobSelect;
  aiProvider: AIProvider;
  isScoring: boolean;
  onSelect: (job: JobSelect) => void;
  onStatusChange: (jobId: string, status: JobStatus) => void;
  onScoreJob: (jobId: string) => void;
  onAiProviderChange: (provider: AIProvider) => void;
  onDeleteJob: (jobId: string) => void;
}

function getCompanyInitials(companyName: string): string {
  if (!companyName) return "CO";
  const words = companyName.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2 && words[0][0] && words[1][0]) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return companyName.trim().slice(0, 2).toUpperCase();
}

export function JobCardItem({
  job,
  aiProvider,
  isScoring,
  onSelect,
  onStatusChange,
  onScoreJob,
  onAiProviderChange,
  onDeleteJob,
}: JobCardItemProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);

  const descriptionSnippet = job.description
    ? job.description
        .replace(/<[^>]*>?/gm, "")
        .trim()
        .slice(0, 160)
    : "No preview snippet available.";

  const locationText = [job.city, job.countryCode || job.country || "DRC"]
    .filter(Boolean)
    .join(", ");

  const companyInitials = getCompanyInitials(job.company);

  return (
    <article
      onClick={() => onSelect(job)}
      aria-labelledby={`job-title-${job.id}`}
      className="bg-white dark:bg-[#121215] border border-slate-300 dark:border-zinc-800 p-5 sm:p-6 lg:p-7 rounded-2xl sm:rounded-3xl flex flex-col justify-between hover:border-slate-400 dark:hover:border-zinc-700 transition duration-200 shadow-sm relative group cursor-pointer"
    >
      <div className="flex items-start gap-4 sm:gap-5">
        {/* Company Initial Logo Box */}
        <div
          aria-hidden="true"
          className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-[#1C1C22] dark:to-[#16161B] border border-slate-300 dark:border-zinc-700/60 text-gray-900 dark:text-slate-100 font-extrabold flex items-center justify-center text-xs sm:text-sm shrink-0 font-sans tracking-wider shadow-xs"
        >
          {companyInitials}
        </div>

        {/* Title, Company, Description & Metadata */}
        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0 flex-1">
              <h3
                id={`job-title-${job.id}`}
                className="text-base sm:text-lg font-bold text-gray-900 dark:text-slate-100 leading-snug truncate"
              >
                {job.title}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 font-semibold mt-0.5 truncate">
                {job.company}
              </p>
            </div>

            {/* Bookmark & Action Buttons */}
            <div
              className="flex items-center gap-1 sm:gap-2 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setIsBookmarked(!isBookmarked)}
                className="text-gray-400 hover:text-amber-500 transition p-1.5 text-sm sm:text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-lg cursor-pointer"
                title={isBookmarked ? "Remove bookmark" : "Bookmark opportunity"}
                aria-label={isBookmarked ? "Remove bookmark" : "Bookmark opportunity"}
              >
                {isBookmarked ? "🔖" : "📑"}
              </button>
              <button
                onClick={() => onDeleteJob(job.id)}
                title="Delete job posting"
                aria-label="Delete job posting"
                className="text-gray-400 hover:text-rose-500 transition p-1.5 text-xs sm:text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 rounded-lg cursor-pointer"
              >
                🗑️
              </button>
            </div>
          </div>

          {/* Description Snippet */}
          <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 leading-relaxed line-clamp-2 pt-0.5">
            {descriptionSnippet}
          </p>

          {/* Metadata Footer Row */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5 pt-2 text-[11px] sm:text-xs text-gray-500 dark:text-zinc-400 font-medium">
            <span className="truncate max-w-[140px] sm:max-w-none">📍 {locationText}</span>

            {job.workplaceType && (
              <span className="bg-gray-100 dark:bg-[#1E1E24] text-gray-700 dark:text-zinc-300 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg font-semibold text-[10px] sm:text-[11px]">
                {job.workplaceType === "remote"
                  ? "Remote"
                  : job.workplaceType === "hybrid"
                  ? "Hybrid"
                  : "On-site"}
              </span>
            )}

            <span>• via {job.source}</span>

            {job.postedAt && (
              <span>
                •{" "}
                {new Date(job.postedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* AI Score Bar & Interactive Actions */}
      <div
        className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 pt-3.5 mt-3.5 sm:pt-5 sm:mt-5 border-t border-slate-200 dark:border-zinc-800/80"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <CardGridSelect
            title="Status"
            value={job.status}
            options={[
              { id: "new", label: "NEW" },
              { id: "scored", label: "SCORED" },
              { id: "applied", label: "APPLIED" },
              { id: "interviewing", label: "INT" },
              { id: "rejected", label: "REJ" },
              { id: "offer", label: "OFFER" },
            ]}
            onChange={(val) => onStatusChange(job.id, val as JobStatus)}
            accentColor="blue"
          />

          <CardGridSelect
            title="AI Engine"
            value={aiProvider}
            options={[
              { id: "claude", label: "Claude" },
              { id: "gemini", label: "Gemini" },
              { id: "openai", label: "OpenAI" },
            ]}
            onChange={(val) => onAiProviderChange(val as AIProvider)}
            accentColor="indigo"
          />
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2.5 sm:gap-3 w-full sm:w-auto pt-1 sm:pt-0">
          {job.fitScore !== null && job.fitScore !== undefined && (() => {
            const scoreStyle = getScoreBadgeStyle(job.fitScore);
            return (
              <span
                className={`text-xs sm:text-sm font-extrabold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border shrink-0 ${scoreStyle.bgColor} ${scoreStyle.borderColor} ${scoreStyle.textColor}`}
              >
                Score: {job.fitScore}/100
              </span>
            );
          })()}

          <button
            onClick={() => onScoreJob(job.id)}
            disabled={isScoring}
            className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold px-3.5 sm:px-4 py-2 rounded-xl transition disabled:opacity-50 shadow-xs text-center cursor-pointer"
          >
            {isScoring ? "Scoring..." : "Score AI"}
          </button>
        </div>
      </div>
    </article>
  );
}
