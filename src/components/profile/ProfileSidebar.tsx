"use client";

import React from "react";

interface ProfileSidebarProps {
  aiProvider: string;
  skillsCount: number;
  resumeLength: number;
}

export function ProfileSidebar({
  aiProvider,
  skillsCount,
  resumeLength,
}: ProfileSidebarProps) {
  const strengthPercentage = Math.min(
    100,
    (resumeLength > 100 ? 50 : 20) + (skillsCount > 0 ? 30 : 0) + 20
  );

  return (
    <aside aria-label="Candidate sidebar overview" className="w-full lg:w-72 space-y-8 shrink-0">
      {/* AT A GLANCE Section */}
      <div className="space-y-4 pt-1 border-t lg:border-t-0 border-slate-300 dark:border-zinc-800/80">
        <h3 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-500">
          AT A GLANCE
        </h3>

        <div className="space-y-4 text-xs">
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="text-base">📄</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-slate-200">
                Resume Document
              </p>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-mono">
                {resumeLength} characters uploaded
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="text-base">⚡</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-slate-200">
                Technical Skills
              </p>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-mono">
                {skillsCount} skill keywords tracked
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="text-base">🤖</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-slate-200">
                Active AI Engine
              </p>
              <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-mono capitalize">
                {aiProvider} Model Engine
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* PROFILE STRENGTH Section */}
      <div className="space-y-3 pt-4 border-t border-slate-300 dark:border-zinc-800/80">
        <div className="flex justify-between items-center text-xs font-semibold">
          <span className="font-mono uppercase text-[11px] text-gray-400 dark:text-zinc-500">
            PROFILE STRENGTH
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

        <p className="text-[11px] text-gray-500 dark:text-zinc-400 leading-relaxed pt-1">
          Add a portfolio link and references to reach 100% and appear higher in recruiter searches.
        </p>
      </div>
    </aside>
  );
}
