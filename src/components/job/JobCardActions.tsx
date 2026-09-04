"use client";

import React from "react";
import Link from "next/link";
import { JobStatus } from "@/services/db/schema";
import { CardGridSelect } from "@/components/ui/card-grid-select";
import { getScoreBadgeStyle } from "@/lib/score-style";
import { useTranslations } from "next-intl";

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
    <div className="mt-5 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      {/* Status selector */}
      <div className="flex items-center text-xs">
        <CardGridSelect
          title="STATUS"
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
      <div className="flex items-center justify-between sm:justify-end gap-3">
        {fitScore !== null &&
          fitScore !== undefined &&
          (() => {
            const scoreStyle = getScoreBadgeStyle(fitScore);
            return (
              <span
                className={`text-xs font-extrabold px-3 py-1.5 rounded-xl border shrink-0 ${scoreStyle.bgColor} ${scoreStyle.borderColor} ${scoreStyle.textColor}`}
              >
                {t("score")}: {fitScore}/100
              </span>
            );
          })()}

        <Link
          href={`/dashboard/jobs/${jobId}`}
          aria-label={`View details for ${jobTitle}`}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold px-5 py-2 rounded-xl transition duration-150 shadow-xs cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5"
        >
          <span>
            {fitScore !== null && fitScore !== undefined
              ? t("viewJob")
              : t("viewAndScore")}
          </span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}
