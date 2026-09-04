"use client";

import React, { useState } from "react";
import Link from "next/link";
import { JobSelect } from "@/dal/jobs.dal";
import { JobStatus } from "@/services/db/schema";
import { JobCardBadges } from "@/components/job/JobCardBadges";
import { JobCardActions } from "@/components/job/JobCardActions";
import { useTranslations } from "next-intl";

interface JobCardItemProps {
  job: JobSelect;
  onSelect?: (job: JobSelect) => void;
  onStatusChange: (jobId: string, status: JobStatus) => void;
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
  onStatusChange,
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
        <div
          aria-hidden="true"
          className="w-12 h-12 rounded-lg bg-[#E2E8F0] dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-bold flex items-center justify-center text-xs font-mono tracking-wider shrink-0"
        >
          {companyInitials}
        </div>

        <div className="flex-1 min-w-0">
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

          <p className="mt-2 text-sm text-gray-600 dark:text-zinc-300 leading-relaxed line-clamp-2 max-w-4xl font-sans">
            {descriptionSnippet}{descriptionSnippet.length >= 240 ? "..." : ""}
          </p>

          <JobCardBadges
            locationText={locationText}
            workplaceLabel={workplaceLabel}
            source={job.source}
            postedDate={postedDate}
          />
        </div>
      </div>

      <JobCardActions
        jobId={job.id}
        jobTitle={job.title}
        status={job.status}
        fitScore={job.fitScore}
        onStatusChange={onStatusChange}
      />
    </article>
  );
}
