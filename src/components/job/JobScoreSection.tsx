"use client";

import React from "react";
import { JobSelect } from "@/dal/jobs.dal";
import { Sparkles, AlertCircle, RotateCcw } from "lucide-react";
import { getScoreBadgeStyle } from "@/lib/score-style";
import { useTranslations } from "next-intl";
import { MatchExplanation } from "./MatchExplanation";
import { SkillGapBreakdown } from "./SkillGapBreakdown";
import { MasterResumeSelect } from "@/services/db/schema";
import { PersonaSelectDropdown } from "./PersonaSelectDropdown";
import { RetryProgressBadge } from "@/components/ui/RetryProgressBadge";
import type { AsyncJobStatus } from "@/hooks/useAsyncJobWithRetry";

interface JobScoreSectionProps {
  job: JobSelect;
  isScoring: boolean;
  scoringError: string | null;
  onScoreJob: () => void;
  resumes?: MasterResumeSelect[];
  selectedResumeId?: string;
  onSelectResume?: (id: string) => void;
  retryStatus?: AsyncJobStatus;
  retryAttempt?: number;
  totalAttempts?: number;
  retryCountdown?: number;
  retryMessage?: string;
  onRetryNow?: () => void;
  onCancelRetry?: () => void;
}

export function JobScoreSection({
  job,
  isScoring,
  scoringError,
  onScoreJob,
  resumes,
  selectedResumeId,
  onSelectResume,
  retryStatus = "idle",
  retryAttempt = 1,
  totalAttempts = 3,
  retryCountdown = 0,
  retryMessage = "",
  onRetryNow,
  onCancelRetry,
}: JobScoreSectionProps) {
  const t = useTranslations("jobDetail");
  const isScored = job.fitScore !== null && job.fitScore !== undefined;
  const scoreStyle = isScored ? getScoreBadgeStyle(job.fitScore!) : null;

  return (
    <section aria-label={t("qualificationMatch")} className="py-4 space-y-3">
      {/* Trigger Row */}
      {/* Header Row: Icon (18px) + Title (text-sm font-medium) + Description (text-sm text-muted) */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Sparkles className="size-4.5 text-muted-foreground dark:text-zinc-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h2 className="text-sm font-medium text-foreground dark:text-zinc-100 font-sans">
              {t("qualificationMatch")}
            </h2>
            <p className="text-sm text-gray-500 dark:text-zinc-400 font-normal leading-relaxed max-w-xl font-sans">
              {t("scoreSubtitle")}
            </p>
          </div>
        </div>

        <div className="shrink-0 pt-0.5 flex items-center gap-2">
          {resumes && resumes.length > 1 && (
            <PersonaSelectDropdown
              resumes={resumes}
              selectedResumeId={selectedResumeId}
              onSelectResume={onSelectResume}
              size="sm"
              disabled={isScoring}
            />
          )}

          {isScoring ? (
            <span className="text-sm font-normal text-muted-foreground inline-flex items-center gap-1.5 font-sans">
              <Sparkles className="size-4.5 animate-spin text-blue-600 dark:text-blue-400 shrink-0" />
              <span>{t("scoring")}</span>
            </span>
          ) : isScored && scoreStyle ? (
            <span
              className={`text-base sm:text-lg font-semibold font-sans ${scoreStyle.textColor}`}
            >
              {t("matchPercent", { score: job.fitScore ?? 0 })}
            </span>
          ) : (
            <button
              type="button"
              onClick={onScoreJob}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1.5 p-0 bg-transparent border-0 cursor-pointer font-sans"
            >
              <span>{t("scoreMatch")}</span>
            </button>
          )}
        </div>
      </div>

      {/* Retry Progress Feedback */}
      <RetryProgressBadge
        status={retryStatus}
        attempt={retryAttempt}
        totalAttempts={totalAttempts}
        countdown={retryCountdown}
        message={retryMessage}
        onRetryNow={onRetryNow}
        onCancel={onCancelRetry}
      />

      {/* Warning/Error Notice */}
      {scoringError && retryStatus !== "retrying" && (
        <div className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 font-normal pt-1">
          <AlertCircle className="size-4.5 shrink-0" />
          <span>{scoringError}</span>
        </div>
      )}

      {/* Lightweight Loading State */}
      {isScoring && (
        <div className="pt-2 pb-1 space-y-2">
          <div className="h-0.5 w-full bg-blue-600/10 dark:bg-blue-400/10 overflow-hidden rounded-full">
            <div className="h-full w-1/3 bg-blue-600 dark:bg-blue-400 animate-pulse" />
          </div>
          <div className="space-y-1.5 pt-1">
            <div className="w-4/5 h-3 rounded bg-muted animate-pulse" />
            <div className="w-2/3 h-3 rounded bg-muted animate-pulse" />
          </div>
        </div>
      )}

      {/* Inline Generated Content */}
      {isScored && !isScoring && (
        <div className="pt-2 space-y-3 font-sans">
          <MatchExplanation explanation={job.scoreReasoning} />

          {/* Matched & Missing Skills Breakdown */}
          <SkillGapBreakdown
            matchedSkills={job.matchedSkills}
            missingSkills={job.missingSkills}
          />

          {/* Gaps Analysis */}
          {Array.isArray(job.gaps) && job.gaps.length > 0 && (
            <div className="pt-1 space-y-1 text-sm font-normal">
              <div className="text-foreground dark:text-zinc-100 font-medium">
                {t("gapsAnalysis")}
              </div>
              <ul className="space-y-1 text-gray-600 dark:text-zinc-300 pl-4">
                {job.gaps.map((gap, i) => (
                  <li key={i} className="list-disc leading-relaxed">
                    {gap}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions Directly Below Content, Separated by Divider */}
          <div className="pt-3 border-t border-border/40 flex items-center justify-between">
            <button
              type="button"
              onClick={onScoreJob}
              disabled={isScoring}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1.5 p-0 bg-transparent border-0 cursor-pointer disabled:opacity-50 font-sans"
            >
              <RotateCcw className="size-4.5 shrink-0" />
              <span>{t("reScore")}</span>
            </button>

            {resumes && resumes.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-sans">
                  {t("personaPrefix")}
                </span>
                <PersonaSelectDropdown
                  resumes={resumes}
                  selectedResumeId={selectedResumeId}
                  onSelectResume={onSelectResume}
                  size="xs"
                  showIcon={false}
                  disabled={isScoring}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
