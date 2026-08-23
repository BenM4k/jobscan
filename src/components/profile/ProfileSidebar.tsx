"use client";

import React from "react";
import { FileText, Briefcase, GraduationCap, Zap, Bot } from "lucide-react";
import { useTranslations } from "next-intl";

interface ProfileSidebarProps {
  aiProvider: string;
  skillsCount: number;
  resumeLength: number;
  experienceCount?: number;
  educationCount?: number;
}

const AI_ENGINE_LABELS: Record<string, string> = {
  gemini: "GEMINI 3.6 FLASH",
  gateway: "AI GATEWAY",
  openai: "OPENAI GPT-4O",
  claude: "CLAUDE 3.5 SONNET",
};

export function ProfileSidebar({
  aiProvider,
  skillsCount,
  resumeLength,
  experienceCount = 0,
  educationCount = 0,
}: ProfileSidebarProps) {
  const t = useTranslations("profile");
  const engineLabel =
    AI_ENGINE_LABELS[aiProvider?.toLowerCase()] ||
    aiProvider?.toUpperCase() ||
    "GEMINI 3.6 FLASH";

  const strengthPercentage = Math.min(
    100,
    (resumeLength > 100 ? 40 : 10) +
      (skillsCount > 0 ? 25 : 0) +
      (experienceCount > 0 ? 20 : 0) +
      (educationCount > 0 ? 15 : 0)
  );

  return (
    <aside aria-label="Candidate sidebar overview" className="w-full lg:w-72 space-y-10 shrink-0">
      {/* AT A GLANCE Section */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500">
          {t("atAGlance")}
        </h3>

        <div className="space-y-4 text-xs">
          {/* Edit Master Resume */}
          <div className="flex items-start gap-3">
            <FileText className="w-4 h-4 text-slate-300 dark:text-zinc-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                {t("editResume")}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono uppercase tracking-wider">
                {resumeLength > 0 ? `${resumeLength} ${t("charsSaved")}` : `0 ${t("charsSaved")}`}
              </p>
            </div>
          </div>

          {/* Work Experience */}
          <div className="flex items-start gap-3">
            <Briefcase className="w-4 h-4 text-slate-300 dark:text-zinc-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                {t("experienceHeading")}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono uppercase tracking-wider">
                {experienceCount} {t("positionsRecorded")}
              </p>
            </div>
          </div>

          {/* Education & Credentials */}
          <div className="flex items-start gap-3">
            <GraduationCap className="w-4 h-4 text-slate-300 dark:text-zinc-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                {t("educationHeading")}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono uppercase tracking-wider">
                {educationCount} {t("degreesRecorded")}
              </p>
            </div>
          </div>

          {/* Technical & Domain Skills */}
          <div className="flex items-start gap-3">
            <Zap className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5 fill-cyan-500/20" />
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                {t("skillsHeading")}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono uppercase tracking-wider">
                {skillsCount} {t("skillsTracked")}
              </p>
            </div>
          </div>

          {/* Active AI Engine Card Box */}
          <div className="bg-[#EDE9FE]/70 dark:bg-purple-950/30 border border-[#DDD6FE] dark:border-purple-900/40 rounded-xl p-3 flex items-center gap-3 pt-3 mt-4">
            <Bot className="w-5 h-5 text-[#7C3AED] dark:text-[#A78BFA] shrink-0" />
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-800 dark:text-zinc-200 leading-none">
                {t("activeAiEngine")}
              </p>
              <p className="text-[10px] font-mono font-bold text-[#7C3AED] dark:text-[#A78BFA] uppercase tracking-wider leading-none">
                {engineLabel}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* PROFILE STRENGTH Section */}
      <div className="space-y-2.5 pt-2">
        <div className="flex justify-between items-center text-xs">
          <span className="font-mono font-bold uppercase tracking-widest text-[10px] text-slate-400 dark:text-zinc-500">
            {t("profileStrength")}
          </span>
          <span className="text-slate-800 dark:text-zinc-200 font-bold text-[11px]">
            {strengthPercentage > 75 ? "Strong" : strengthPercentage > 40 ? "Medium" : "Basic"}
          </span>
        </div>

        <div
          role="progressbar"
          aria-label="Profile Strength"
          aria-valuenow={strengthPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          className="w-full bg-slate-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden"
        >
          <div
            className="bg-[#10B981] h-full rounded-full transition-all duration-500"
            style={{ width: `${strengthPercentage}%` }}
          />
        </div>
      </div>
    </aside>
  );
}
