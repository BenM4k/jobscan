"use client";

import React from "react";
import { useTranslations } from "next-intl";

interface ProfileSidebarProps {
  aiProvider: string;
  skillsCount: number;
  resumeLength: number;
  experienceCount?: number;
  educationCount?: number;
}

export function ProfileSidebar({
  skillsCount,
  resumeLength,
  experienceCount = 0,
  educationCount = 0,
}: ProfileSidebarProps) {
  const t = useTranslations("profile");

  const strengthPercentage = Math.min(
    100,
    (resumeLength > 100 ? 40 : 10) +
      (skillsCount > 0 ? 25 : 0) +
      (experienceCount > 0 ? 20 : 0) +
      (educationCount > 0 ? 15 : 0)
  );

  return (
    <aside aria-label="Candidate sidebar overview" className="w-full lg:w-72 space-y-8 shrink-0">
      {/* AT A GLANCE Section */}
      <div className="space-y-4 pt-1 border-t lg:border-t-0 border-slate-300 dark:border-zinc-800/80">
        <h3 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-500">
          {t("atAGlance")}
        </h3>

        <div className="space-y-4 text-xs">
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="text-base">📄</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-slate-200">
                {t("editResume")}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-mono">
                {resumeLength > 0 ? `${resumeLength} ${t("charsSaved")}` : "0"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="text-base">💼</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-slate-200">
                {t("experienceHeading")}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-mono">
                {experienceCount} {t("positionsRecorded")}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="text-base">🎓</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-slate-200">
                {t("educationHeading")}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-mono">
                {educationCount} {t("degreesRecorded")}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="text-base">⚡</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-slate-200">
                {t("skillsHeading")}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-mono">
                {skillsCount} {t("skillsTracked")}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="text-base">🤖</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-slate-200">
                {t("activeAiEngine")}
              </p>
              <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-mono capitalize">
                Gemini 3.6 Flash
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* PROFILE STRENGTH Section */}
      <div className="space-y-3 pt-4 border-t border-slate-300 dark:border-zinc-800/80">
        <div className="flex justify-between items-center text-xs font-semibold">
          <span className="font-mono uppercase text-[11px] text-gray-400 dark:text-zinc-500">
            {t("profileStrength")}
          </span>
          <span className="text-gray-900 dark:text-slate-200 font-bold">
            {strengthPercentage > 75 ? "Strong" : strengthPercentage > 40 ? "Medium" : "Basic"}
          </span>
        </div>

        <div
          role="progressbar"
          aria-label="Profile Strength"
          aria-valuenow={strengthPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          className="w-full bg-gray-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden"
        >
          <div
            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${strengthPercentage}%` }}
          />
        </div>
      </div>
    </aside>
  );
}
