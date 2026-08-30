import React, { useState } from "react";
import Link from "next/link";
import { JobSelect } from "@/dal/jobs.dal";
import { JobStatus } from "@/services/db/schema";
import { getScoreBadgeStyle } from "@/lib/score-style";
import { CardGridSelect } from "@/components/ui/card-grid-select";
import { useTranslations } from "next-intl";

type AIProvider = "claude" | "gemini" | "openai" | "gateway";

interface JobCardItemProps {
  job: JobSelect;
  aiProvider: AIProvider;
  isScoring: boolean;
  onSelect?: (job: JobSelect) => void;
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
  onStatusChange,
  onScoreJob,
  onAiProviderChange,
  onDeleteJob,
}: JobCardItemProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const t = useTranslations("dashboard");

  const descriptionSnippet = job.description
    ? job.description
        .replace(/<[^>]*>?/gm, "")
        .trim()
        .slice(0, 240)
    : "No preview snippet available.";

  const locationText = [job.city, job.countryCode || job.country || "DRC"]
    .filter(Boolean)
    .join(", ");

  const companyInitials = getCompanyInitials(job.company);

  const postedDate = job.postedAt
    ? new Date(job.postedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      })
    : null;

  const workplaceLabel =
    job.workplaceType === "remote"
      ? t("remote")
      : job.workplaceType === "hybrid"
        ? t("hybrid")
        : job.workplaceType === "onsite"
          ? t("onSite")
          : "REMOTE";

  return (
    <article
      aria-labelledby={`job-title-${job.id}`}
      className="py-8 sm:py-9 transition duration-150 group"
    >
      {/* Top Header: Company Avatar + Job Info + Actions */}
      <div className="flex items-start gap-4 sm:gap-5">
        {/* Company Initials Avatar Box */}
        <div
          aria-hidden="true"
          className="w-12 h-12 rounded-lg bg-[#E2E8F0] dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-bold flex items-center justify-center text-xs font-mono tracking-wider shrink-0"
        >
          {companyInitials}
        </div>

        {/* Info & Text Area */}
        <div className="flex-1 min-w-0">
          {/* Title Row & Star/Close Buttons */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h3
                id={`job-title-${job.id}`}
                className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-slate-100 leading-snug tracking-tight font-sans"
              >
                <Link
                  href={`/dashboard/jobs/${job.id}`}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-block"
                >
                  {job.title}
                </Link>
              </h3>
              <p className="text-sm text-gray-500 dark:text-zinc-400 font-normal mt-0.5">
                {job.company}
              </p>
            </div>

            {/* Bookmark & Delete action buttons */}
            <div className="flex items-center gap-2 shrink-0 pt-0.5">
              <button
                onClick={() => setIsBookmarked(!isBookmarked)}
                aria-label={isBookmarked ? "Remove bookmark" : "Bookmark opportunity"}
                className="text-gray-400 hover:text-amber-500 transition p-1 text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded cursor-pointer"
              >
                <span className={isBookmarked ? "text-amber-500" : ""}>
                  {isBookmarked ? "★" : "☆"}
                </span>
              </button>
              <button
                onClick={() => onDeleteJob(job.id)}
                aria-label={`Delete ${job.title}`}
                className="text-gray-400 hover:text-rose-500 transition p-1 text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Job description summary */}
          <p className="mt-2 text-sm text-gray-600 dark:text-zinc-300 leading-relaxed line-clamp-2 max-w-4xl font-sans">
            {descriptionSnippet}{descriptionSnippet.length >= 240 ? "..." : ""}
          </p>

          {/* Badges / Meta row */}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-gray-400 dark:text-zinc-500 font-medium">
            {locationText && (
              <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                <span aria-hidden="true">📍</span>
                <span>{locationText}</span>
              </span>
            )}

            {workplaceLabel && (
              <span className="bg-[#E0F2FE] dark:bg-cyan-950/50 text-[#0284C7] dark:text-cyan-400 border border-[#BAE6FD] dark:border-cyan-800 text-[11px] font-bold px-2 py-0.5 rounded tracking-wide uppercase">
                {workplaceLabel}
              </span>
            )}

            {job.source && (
              <span className="font-mono text-[11px] uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                • VIA {job.source}
              </span>
            )}

            {postedDate && (
              <span className="font-mono text-[11px] uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                • {postedDate}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Bar: Status / AI Engine + Score Job CTA */}
      <div className="mt-5 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status and AI Engine selectors */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <CardGridSelect
            title="STATUS"
            value={job.status}
            options={[
              { id: "new", label: t("statusNew") },
              { id: "scored", label: t("statusScored") },
              { id: "applied", label: t("statusApplied") },
              { id: "interviewing", label: t("statusInterviewing") },
              { id: "rejected", label: t("statusRejected") },
              { id: "offer", label: t("statusOffer") },
            ]}
            onChange={(val) => onStatusChange(job.id, val as JobStatus)}
            accentColor="blue"
          />

          <CardGridSelect
            title="AI ENGINE"
            value={aiProvider}
            options={[
              { id: "gateway", label: "Gateway" },
              { id: "gemini", label: "Gemini" },
              { id: "openai", label: "OpenAI" },
              { id: "claude", label: "Claude" },
            ]}
            onChange={(val) => onAiProviderChange(val as AIProvider)}
            accentColor="indigo"
          />
        </div>

        {/* Score Badge and Score Job Button */}
        <div className="flex items-center justify-between sm:justify-end gap-3">
          {job.fitScore !== null &&
            job.fitScore !== undefined &&
            (() => {
              const scoreStyle = getScoreBadgeStyle(job.fitScore);
              return (
                <span
                  className={`text-xs font-extrabold px-3 py-1.5 rounded-xl border shrink-0 ${scoreStyle.bgColor} ${scoreStyle.borderColor} ${scoreStyle.textColor}`}
                >
                  {t("score")}: {job.fitScore}/100
                </span>
              );
            })()}

          <button
            onClick={() => onScoreJob(job.id)}
            disabled={isScoring}
            aria-label={`Score ${job.title} with AI`}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold px-6 py-2 rounded-xl transition duration-150 disabled:opacity-50 shadow-sm cursor-pointer whitespace-nowrap"
          >
            {isScoring ? t("scoring") : t("scoreJob")}
          </button>
        </div>
      </div>
    </article>
  );
}
