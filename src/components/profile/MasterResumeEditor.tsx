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
    <div className="space-y-6 pt-2">
      {/* Header with Title & View Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-zinc-100">
            {t("masterDetailsTitle")}
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            {t("subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-xl border border-slate-200 dark:border-zinc-700/60 self-start sm:self-auto font-mono">
          <button
            type="button"
            onClick={() => setActiveTab("structured")}
            className={`text-xs font-bold px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === "structured"
                ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            {t("structuredView")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("raw")}
            className={`text-xs font-bold px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === "raw"
                ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            {t("rawMarkdown")}
          </button>
        </div>
      </div>

      {activeTab === "structured" ? (
        <div className="space-y-6 pt-2">
          {/* Executive Summary */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400">
              {t("executiveSummary")}
            </label>
            <textarea
              rows={4}
              value={summary}
              onChange={(e) => onSummaryChange(e.target.value)}
              placeholder="e.g. Accomplished and innovative Software Engineer specializing in Frontend Development..."
              className="w-full bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 text-xs sm:text-[13px] p-4 rounded-xl focus:outline-none focus:border-blue-500 transition shadow-2xs leading-relaxed"
            />
          </div>

          {/* Technical Skills */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400">
              {t("technicalSkillsLabel")}
            </label>
            <input
              type="text"
              value={skills}
              onChange={(e) => onSkillsChange(e.target.value)}
              placeholder="JavaScript, React, Redux, Jest, HTML, CSS, RESTful APIs, Node.js..."
              className="w-full bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 text-xs sm:text-[13px] p-3 rounded-xl focus:outline-none focus:border-blue-500 transition shadow-2xs"
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
        <div className="space-y-2 pt-2">
          <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400">
            {t("rawMarkdown")}
          </label>
          <textarea
            rows={16}
            value={resumeText}
            onChange={(e) => onResumeTextChange(e.target.value)}
            placeholder="Paste your complete raw CV/resume in markdown or plain text format here..."
            className="w-full bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 p-4 rounded-xl text-xs font-mono leading-relaxed focus:outline-none focus:border-blue-500 shadow-2xs"
          />
        </div>
      )}
    </div>
  );
}
