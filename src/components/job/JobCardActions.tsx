"use client";

import React from "react";
import Link from "next/link";
import { JobStatus } from "@/services/db/schema";
import { CardGridSelect } from "@/components/ui/card-grid-select";
import { getScoreBadgeStyle } from "@/lib/score-style";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";

interface JobCardActionsProps {
  jobId: string;
  jobTitle: string;
  status: string;
  fitScore?: number | null;
  onStatusChange: (jobId: string, status: JobStatus) => void;
}

export function JobCardActions({
  jobId,
  jobTitle,
  status,
  fitScore,
  onStatusChange,
}: JobCardActionsProps) {
  const t = useTranslations("dashboard");

  return (
    <div className="mt-5 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-200/50 dark:border-zinc-800/50">
      {/* Status selector */}
      <div className="flex items-center text-xs">
        <CardGridSelect
          title={t("status")}
          value={status}
          options={[
            { id: "new", label: t("statusNew") },
            { id: "scored", label: t("statusScored") },
            { id: "applied", label: t("statusApplied") },
            { id: "interviewing", label: t("statusInterviewing") },
            { id: "rejected", label: t("statusRejected") },
            { id: "offer", label: t("statusOffer") },
          ]}
          onChange={(val) => onStatusChange(jobId, val as JobStatus)}
          accentColor="blue"
        />
      </div>

      {/* Score Badge (if scored) and View Link */}
      <div className="flex items-center justify-between sm:justify-end gap-4">
        {fitScore !== null &&
          fitScore !== undefined &&
          (() => {
            const scoreStyle = getScoreBadgeStyle(fitScore);
            return (
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-lg border shrink-0 ${scoreStyle.bgColor} ${scoreStyle.borderColor} ${scoreStyle.textColor}`}
              >
                {t("score")}: {fitScore}%
              </span>
            );
          })()}

        <Link
          href={`/dashboard/jobs/${jobId}`}
          aria-label={`View details for ${jobTitle}`}
          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1 cursor-pointer whitespace-nowrap font-sans p-0 bg-transparent border-0 group"
        >
          <span>
            {fitScore !== null && fitScore !== undefined
              ? t("viewJob")
              : t("viewAndScore")}
          </span>
          <ArrowRight className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
