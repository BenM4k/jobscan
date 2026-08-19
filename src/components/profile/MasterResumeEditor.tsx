"use client";

import React from "react";
import { EducationItem, ExperienceItem } from "@/lib/ai";
import { ExperienceEditor } from "./ExperienceEditor";
import { EducationEditor } from "./EducationEditor";
import { useTranslations } from "next-intl";

interface MasterResumeEditorProps {
  summary: string;
  skills: string;
  education: EducationItem[];
  experience: ExperienceItem[];
  resumeText: string;
  onSummaryChange: (val: string) => void;
  onSkillsChange: (val: string) => void;
  onEducationChange: (items: EducationItem[]) => void;
  onExperienceChange: (items: ExperienceItem[]) => void;
  onResumeTextChange: (val: string) => void;
}

export function MasterResumeEditor({
  summary,
  skills,
  education,
  experience,
  resumeText,
  onSummaryChange,
  onSkillsChange,
  onEducationChange,
  onExperienceChange,
  onResumeTextChange,
}: MasterResumeEditorProps) {
  const [activeTab, setActiveTab] = React.useState<"structured" | "raw">("structured");
  const t = useTranslations("profile");

  return (
    <div className="bg-white dark:bg-[#121215] border border-slate-300 dark:border-zinc-800 p-6 sm:p-8 rounded-3xl space-y-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-zinc-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">
            {t("masterDetailsTitle")}
          </h3>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
            {t("subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("structured")}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === "structured"
                ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs"
                : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            {t("structuredView")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("raw")}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === "raw"
                ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs"
                : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            {t("rawMarkdown")}
          </button>
        </div>
      </div>

      {activeTab === "structured" ? (
        <div className="space-y-6">
          {/* Executive Summary */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
              {t("executiveSummary")}
            </label>
            <textarea
              rows={4}
              value={summary}
              onChange={(e) => onSummaryChange(e.target.value)}
              placeholder="e.g. Proven software architect with 8+ years experience designing high-scale React/Node platforms..."
              className="w-full bg-slate-50 dark:bg-[#18181D] border border-slate-300 dark:border-zinc-800 text-gray-900 dark:text-slate-100 text-xs sm:text-sm p-4 rounded-2xl focus:outline-none focus:border-blue-500 transition shadow-xs leading-relaxed"
            />
          </div>

          {/* Technical Skills */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
              {t("technicalSkillsLabel")}
            </label>
            <input
              type="text"
              value={skills}
              onChange={(e) => onSkillsChange(e.target.value)}
              placeholder="React, TypeScript, Next.js, Node.js, PostgreSQL, Docker, AWS, System Architecture"
              className="w-full bg-slate-50 dark:bg-[#18181D] border border-slate-300 dark:border-zinc-800 text-gray-900 dark:text-slate-100 text-xs sm:text-sm p-3.5 rounded-2xl focus:outline-none focus:border-blue-500 transition shadow-xs"
            />
          </div>

          {/* Work Experience Editor */}
          <ExperienceEditor
            experiences={experience}
            onChange={onExperienceChange}
          />

          {/* Education Editor */}
          <EducationEditor
            education={education}
            onChange={onEducationChange}
          />
        </div>
      ) : (
        /* Raw Markdown Tab */
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
            {t("rawMarkdown")}
          </label>
          <textarea
            rows={16}
            value={resumeText}
            onChange={(e) => onResumeTextChange(e.target.value)}
            placeholder="Paste your complete raw CV/resume in markdown or plain text format here..."
            className="w-full bg-slate-50 dark:bg-[#18181D] border border-slate-300 dark:border-zinc-800 text-gray-900 dark:text-slate-100 p-4 rounded-2xl text-xs font-mono leading-relaxed focus:outline-none focus:border-blue-500"
          />
        </div>
      )}
    </div>
  );
}
