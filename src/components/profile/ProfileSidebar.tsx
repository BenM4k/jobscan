"use client";

import React from "react";
import { FileText, Briefcase, GraduationCap, Zap, Bot } from "lucide-react";
import { useTranslations } from "next-intl";
import { AiUsageProgress } from "@/components/shared/AiUsageProgress";
import type { UserAiUsage } from "@/services/ai/usage.service";

interface ProfileSidebarProps {
  aiProvider: string;
  skillsCount: number;
  resumeLength: number;
  experienceCount?: number;
  educationCount?: number;
  aiUsage?: UserAiUsage | null;
}

const AI_ENGINE_LABELS: Record<string, string> = {
  gemini: "Gemini 3.8 Flash",
  gateway: "AI Gateway",
  openai: "OpenAI GPT-4o",
  claude: "Claude 3.5 Sonnet",
};

export function ProfileSidebar({
  aiProvider,
  skillsCount,
  resumeLength,
  experienceCount = 0,
  educationCount = 0,
  aiUsage,
}: ProfileSidebarProps) {
  const t = useTranslations("profile");
  const engineLabel =
    AI_ENGINE_LABELS[aiProvider?.toLowerCase()] ||
    (aiProvider ? aiProvider.charAt(0).toUpperCase() + aiProvider.slice(1) : "Gemini 3.8 Flash");

  const strengthPercentage = Math.min(
    100,
    (resumeLength > 100 ? 40 : 10) +
      (skillsCount > 0 ? 25 : 0) +
      (experienceCount > 0 ? 20 : 0) +
      (educationCount > 0 ? 15 : 0)
  );

  return (
    <aside aria-label="Candidate sidebar overview" className="w-full lg:w-72 space-y-10 shrink-0">
      {/* At a Glance Section */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold text-slate-700 dark:text-zinc-300 font-sans">
          {t("atAGlance")}
        </h3>

        <div className="space-y-4">
          {/* Master Resume */}
          <div className="flex items-start gap-3">
            <FileText className="w-4 h-4 text-slate-400 dark:text-zinc-500 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-slate-900 dark:text-zinc-100">
                {t("editResume")}
              </p>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                {resumeLength > 0 ? `${resumeLength} ${t("charsSaved")}` : `0 ${t("charsSaved")}`}
              </p>
            </div>
          </div>

          {/* Work Experience */}
          <div className="flex items-start gap-3">
            <Briefcase className="w-4 h-4 text-slate-400 dark:text-zinc-500 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-slate-900 dark:text-zinc-100">
                {t("experienceHeading")}
              </p>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                {experienceCount} {t("positionsRecorded")}
              </p>
            </div>
          </div>

          {/* Education & Credentials */}
          <div className="flex items-start gap-3">
            <GraduationCap className="w-4 h-4 text-slate-400 dark:text-zinc-500 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-slate-900 dark:text-zinc-100">
                {t("educationHeading")}
              </p>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                {educationCount} {t("degreesRecorded")}
              </p>
            </div>
          </div>

          {/* Technical & Domain Skills */}
          <div className="flex items-start gap-3">
            <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5 fill-blue-600/20" />
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-slate-900 dark:text-zinc-100">
                {t("skillsHeading")}
              </p>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                {skillsCount} {t("skillsTracked")}
              </p>
            </div>
          </div>

          {/* Active AI Engine Callout Box */}
          <div className="bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 rounded-xl p-3 flex items-center gap-3 mt-4">
            <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-slate-900 dark:text-zinc-100">
                {t("activeAiEngine")}
              </p>
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 font-sans">
                {engineLabel}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Strength Section */}
      <div className="space-y-2.5 pt-2">
        <div className="flex justify-between items-center text-xs">
          <span className="font-semibold text-slate-700 dark:text-zinc-300">
            {t("profileStrength")}
          </span>
          <span className="text-slate-800 dark:text-zinc-200 font-semibold text-xs">
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
            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${strengthPercentage}%` }}
          />
        </div>
      </div>

      {/* AI Usage Progress */}
      <AiUsageProgress variant="sidebar" usage={aiUsage} />
    </aside>
  );
}
