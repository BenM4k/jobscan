"use client";

import React, { useState } from "react";
import Link from "next/link";
import { JobSelect } from "@/dal/jobs.dal";
import { JobStatus } from "@/services/db/schema";
import { JobCardBadges } from "@/components/job/JobCardBadges";
import { JobCardActions } from "@/components/job/JobCardActions";
import { useTranslations } from "next-intl";
import { Bookmark, X } from "lucide-react";

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

function extractRoleSnippet(
  rawDescription?: string | null,
  company?: string,
): string {
  if (!rawDescription) return "No role preview available.";

  // 1. Strip HTML tags and normalize whitespace
  const clean = rawDescription
    .replace(/<[^>]*>?/gm, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) return "No role preview available.";

  // 2. Identify role-specific entry points
  const roleMarkers = [
    /(?:about the role|role overview|position overview|job summary|the opportunity|what you['’]ll do|responsibilities|the role:?|overview:?|we are looking for|you will:?)\s*[:\-–—]?\s*(.+)/i,
  ];

  for (const marker of roleMarkers) {
    const match = clean.match(marker);
    if (match && match[1] && match[1].trim().length > 30) {
      const snippet = match[1].trim();
      return snippet.length > 220
        ? `${snippet.slice(0, 220).trim()}...`
        : snippet;
    }
  }

  // 3. If no marker, strip repetitive company boilerplate paragraph
  const escapedCompany = company
    ? company.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    : "";
  const companyPattern = escapedCompany
    ? new RegExp(
        `^(?:about\\s+${escapedCompany}|${escapedCompany}\\s+is|at\\s+${escapedCompany})[^.!?]+[.!?]\\s*`,
        "i",
      )
    : null;
  let text = clean;
  if (companyPattern && companyPattern.test(text)) {
    text = text.replace(companyPattern, "").trim();
  }

  // Generic boilerplate: "About Us: ...", "Who We Are: ..."
  text = text
    .replace(
      /^(?:about us|who we are|company overview)\s*[:\-–—]?\s*[^.!?]+[.!?]\s*/i,
      "",
    )
    .trim();

  if (!text) {
    text = clean;
  }

  return text.length > 220 ? `${text.slice(0, 220).trim()}...` : text;
}

export function JobCardItem({
  job,
  onStatusChange,
  onDeleteJob,
}: JobCardItemProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const t = useTranslations("dashboard");

  const descriptionSnippet = extractRoleSnippet(job.description, job.company);

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
        : job.workplaceType === "onsite" || job.workplaceType === "on-site"
          ? t("onSite")
          : job.workplaceType || undefined;

  return (
    <article
      aria-labelledby={`job-title-${job.id}`}
      className="transition duration-150 group"
    >
      {/* Top Header: Company Avatar + Job Info + Actions */}
      <div className="flex items-start gap-4 sm:gap-5">
        <div
          aria-hidden="true"
          className="w-12 h-12 rounded-lg bg-slate-200 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-bold flex items-center justify-center text-xs font-mono tracking-wider shrink-0"
        >
          {companyInitials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h3
                id={`job-title-${job.id}`}
                className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-slate-100 leading-snug tracking-tight font-sans wrap-break-word"
              >
                <Link
                  href={`/dashboard/jobs/${job.id}`}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-block"
                >
                  {job.title}
                </Link>
              </h3>
              <p className="text-sm text-gray-500 dark:text-zinc-400 font-normal mt-0.5 font-sans wrap-break-word">
                {job.company}
              </p>
            </div>

            {/* Save & Dismiss actions with accessible labels and >= 32px touch target */}
            <div className="flex items-center gap-1 shrink-0 -mt-1">
              <button
                type="button"
                onClick={() => setIsBookmarked(!isBookmarked)}
                aria-label={
                  isBookmarked ? "Remove saved opportunity" : "Save opportunity"
                }
                className="size-8 min-w-8 min-h-8 flex items-center justify-center text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-200/50 dark:hover:bg-zinc-800/60 rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <Bookmark
                  className={`size-4 transition-colors ${
                    isBookmarked ? "fill-amber-500 text-amber-500" : ""
                  }`}
                />
              </button>
              <button
                type="button"
                onClick={() => onDeleteJob(job.id)}
                aria-label="Dismiss opportunity"
                className="size-8 min-w-8 min-h-8 flex items-center justify-center text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200/50 dark:hover:bg-zinc-800/60 rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          <p className="mt-2 text-sm text-gray-600 dark:text-zinc-300 leading-relaxed max-w-4xl font-sans wrap-break-word">
            {descriptionSnippet}
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
