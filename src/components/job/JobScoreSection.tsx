"use client";

import React from "react";
import { JobSelect } from "@/dal/jobs.dal";
import { getScoreBadgeStyle } from "@/lib/score-style";
import { useTranslations } from "next-intl";

interface JobScoreSectionProps {
  job: JobSelect;
  isScoring: boolean;
  scoringError: string | null;
  onScoreJob: () => void;
}

export function JobScoreSection({
  job,
  isScoring,
  scoringError,
  onScoreJob,
}: JobScoreSectionProps) {
  const isScored = job.fitScore !== null && job.fitScore !== undefined;
  const t = useTranslations("jobDetail");

  return (
    <section aria-labelledby="ai-match-score-heading" className="space-y-4">
      {scoringError && (
        <div
          role="alert"
          aria-live="polite"
          className="p-3.5 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200 text-xs font-semibold rounded-xl flex items-center justify-between shadow-xs"
        >
          <span>⚠️ {scoringError}</span>
        </div>
      )}

      {/* Main Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-base text-indigo-600 dark:text-indigo-400 font-bold">✧</span>
            <h3
              id="ai-match-score-heading"
              className="text-sm sm:text-base font-bold text-gray-900 dark:text-white"
            >
              {t("scoreHeading")}
            </h3>
          </div>
          <p className="text-xs text-gray-600 dark:text-zinc-400 max-w-xl leading-relaxed">
            Run Gemini 3.6 Flash to evaluate your Master Resume against this job posting,
            identify matched/missing skill keywords, and compute a qualification fit score.
          </p>
        </div>

        <button
          type="button"
          onClick={onScoreJob}
          disabled={isScoring}
          className="bg-[#dbeafe] dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 border border-indigo-200/80 dark:border-indigo-800/80 font-semibold text-xs px-4 py-2.5 rounded-xl transition inline-flex items-center justify-center gap-1.5 shrink-0 shadow-xs cursor-pointer disabled:opacity-50 self-start sm:self-auto"
        >
          {isScoring ? (
            <>
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
              <span>{t("scoringWithAi")}</span>
            </>
          ) : isScored ? (
            <>
              <span>✧</span>
              <span>{t("reScore")} ({job.fitScore}%)</span>
            </>
          ) : (
            <>
              <span>✧</span>
              <span>Score with Gemini Flash</span>
            </>
          )}
        </button>
      </div>

      {/* Scored Breakdown Details Card */}
      {isScored && (
        (() => {
          const scoreStyle = getScoreBadgeStyle(job.fitScore!);
          return (
            <div
              className={`p-5 sm:p-6 rounded-2xl border space-y-4 transition shadow-xs mt-3 ${scoreStyle.bgColor} ${scoreStyle.borderColor}`}
            >
              {/* Header with Score Ring/Badge */}
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-black/10 dark:border-white/10 flex items-center justify-center font-black text-sm shadow-xs font-mono">
                  <span className={scoreStyle.textColor}>{job.fitScore}%</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-slate-100">
                    Qualification Fit Assessment
                  </h4>
                  <p className="text-[11px] text-gray-600 dark:text-zinc-400">
                    Evaluated against your Master Resume
                  </p>
                </div>
              </div>

              {/* Matched & Missing Skills Breakdown Tags */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-black/5 dark:border-white/5">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                    <span>✓</span>
                    <span>{t("matchedSkills")} ({job.matchedSkills?.length || 0})</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {job.matchedSkills?.length ? (
                      job.matchedSkills.map((skill, i) => (
                        <span
                          key={i}
                          className="text-[11px] bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded-md font-medium"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-500 italic">None specifically parsed</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300 flex items-center gap-1">
                    <span>!</span>
                    <span>{t("missingSkills")} ({job.missingSkills?.length || 0})</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {job.missingSkills?.length ? (
                      job.missingSkills.map((skill, i) => (
                        <span
                          key={i}
                          className="text-[11px] bg-rose-100/80 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800 px-2 py-0.5 rounded-md font-medium"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-500 italic">No significant missing skills</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Gaps Analysis */}
              {Array.isArray(job.gaps) && job.gaps.length > 0 && (
                <div className="space-y-1 pt-2 border-t border-black/5 dark:border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    {t("gapsAnalysis")}
                  </span>
                  <ul className="list-disc pl-4 space-y-0.5 text-xs text-gray-800 dark:text-slate-200">
                    {job.gaps.map((gap, i) => (
                      <li key={i}>{gap}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Reasoning */}
              {job.scoreReasoning && (
                <div className="pt-2 border-t border-black/5 dark:border-white/5 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300">
                    {t("reasoning")}
                  </span>
                  <p className="text-xs text-gray-800 dark:text-slate-200 leading-relaxed font-sans">
                    {job.scoreReasoning}
                  </p>
                </div>
              )}
            </div>
          );
        })()
      )}
    </section>
  );
}
