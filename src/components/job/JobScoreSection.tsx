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
          className="p-4 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200 text-xs font-semibold rounded-2xl flex items-center justify-between shadow-xs"
        >
          <span>⚠️ {scoringError}</span>
        </div>
      )}

      {isScored ? (
        (() => {
          const scoreStyle = getScoreBadgeStyle(job.fitScore!);
          return (
            <div
              className={`p-6 sm:p-7 rounded-3xl border space-y-5 transition shadow-xs ${scoreStyle.bgColor} ${scoreStyle.borderColor}`}
            >
              {/* Header with Score Ring/Badge & Re-score Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-black/10 dark:border-white/10 flex items-center justify-center font-black text-base shadow-xs">
                    <span className={scoreStyle.textColor}>{job.fitScore}%</span>
                  </div>
                  <div>
                    <h3
                      id="ai-match-score-heading"
                      className="text-sm font-bold text-gray-900 dark:text-slate-100"
                    >
                      {t("scoreHeading")}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-zinc-400">
                      Evaluated with Gemini 3.6 Flash against your Master Resume
                    </p>
                  </div>
                </div>

                <button
                  onClick={onScoreJob}
                  disabled={isScoring}
                  className="bg-gray-900 hover:bg-black dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
                >
                  {isScoring ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                      {t("scoringWithAi")}
                    </>
                  ) : (
                    t("reScore")
                  )}
                </button>
              </div>

              {/* Matched & Missing Skills Breakdown Tags */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-black/5 dark:border-white/5">
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <span>✓</span>
                    <span>{t("matchedSkills")} ({job.matchedSkills?.length || 0})</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {job.matchedSkills?.length ? (
                      job.matchedSkills.map((skill, i) => (
                        <span
                          key={i}
                          className="text-xs bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 px-2.5 py-0.5 rounded-lg font-medium"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-500 italic">None specifically parsed</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                    <span>!</span>
                    <span>{t("missingSkills")} ({job.missingSkills?.length || 0})</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {job.missingSkills?.length ? (
                      job.missingSkills.map((skill, i) => (
                        <span
                          key={i}
                          className="text-xs bg-rose-100/80 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800 px-2.5 py-0.5 rounded-lg font-medium"
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
                <div className="space-y-1.5 pt-2 border-t border-black/5 dark:border-white/5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    {t("gapsAnalysis")}
                  </span>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-gray-800 dark:text-slate-200">
                    {job.gaps.map((gap, i) => (
                      <li key={i}>{gap}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Reasoning */}
              {job.scoreReasoning && (
                <div className="pt-2 border-t border-black/5 dark:border-white/5 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300">
                    {t("reasoning")}
                  </span>
                  <p className="text-xs sm:text-sm text-gray-800 dark:text-slate-200 leading-relaxed font-sans">
                    {job.scoreReasoning}
                  </p>
                </div>
              )}
            </div>
          );
        })()
      ) : (
        /* Not Scored State */
        <div className="p-6 sm:p-8 rounded-3xl bg-linear-to-br from-indigo-50/90 via-blue-50/60 to-purple-50/50 dark:from-[#131422] dark:via-[#111624] dark:to-[#171322] border border-indigo-200/80 dark:border-indigo-900/50 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-lg">✦</span>
                <h3
                  id="ai-match-score-heading"
                  className="text-base font-bold text-gray-900 dark:text-slate-100"
                >
                  {t("scoreHeading")}
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 max-w-xl leading-relaxed">
                Run Gemini 3.6 Flash to evaluate your Master Resume against this job posting,
                identify matched/missing skill keywords, and compute a qualification fit score.
              </p>
            </div>

            <button
              onClick={onScoreJob}
              disabled={isScoring}
              className="bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold px-5 py-3 rounded-xl transition shadow-md shadow-blue-500/20 disabled:opacity-50 inline-flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              {isScoring ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                  <span>{t("scoringWithAi")}</span>
                </>
              ) : (
                <>
                  <span>✦</span>
                  <span>{t("scoreWithAi")}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
