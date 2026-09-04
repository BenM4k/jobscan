"use client";

import React from "react";
import { JobStatus } from "@/services/db/schema";
import { CardGridSelect } from "@/components/ui/card-grid-select";
import { getScoreBadgeStyle } from "@/lib/score-style";
import { useTranslations } from "next-intl";

export type AIProvider = "claude" | "gemini" | "openai" | "gateway";

interface JobCardActionsProps {
  jobId: string;
  jobTitle: string;
  status: string;
  aiProvider: AIProvider;
  fitScore?: number | null;
  isScoring: boolean;
  onStatusChange: (jobId: string, status: JobStatus) => void;
  onScoreJob: (jobId: string) => void;
  onAiProviderChange: (provider: AIProvider) => void;
}

export function JobCardActions({
  jobId,
  jobTitle,
  status,
  aiProvider,
  fitScore,
  isScoring,
  onStatusChange,
  onScoreJob,
  onAiProviderChange,
}: JobCardActionsProps) {
  const t = useTranslations("dashboard");

  return (
    <div className="mt-5 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      {/* Status and AI Engine selectors */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
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

        <button
          onClick={() => onScoreJob(jobId)}
          disabled={isScoring}
          aria-label={`Score ${jobTitle} with AI`}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold px-6 py-2 rounded-xl transition duration-150 disabled:opacity-50 shadow-sm cursor-pointer whitespace-nowrap"
        >
          {isScoring ? t("scoring") : t("scoreJob")}
        </button>
      </div>
    </div>
  );
}
