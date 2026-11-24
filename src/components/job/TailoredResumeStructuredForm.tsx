"use client";

import React from "react";
import { useTranslations } from "next-intl";
import type { EducationItem, ExperienceItem } from "@/lib/ai";
import type { TailoredResumeDocument } from "@/lib/tailored-resume-document";
import { ExperienceEditor } from "@/components/profile/ExperienceEditor";
import { EducationEditor } from "@/components/profile/EducationEditor";

interface TailoredResumeStructuredFormProps {
  doc: TailoredResumeDocument;
  onDocChange: (next: TailoredResumeDocument) => void;
}

const inputClass =
  "w-full bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 text-base sm:text-xs p-2.5 rounded-xl focus:outline-none focus:border-blue-500 shadow-2xs transition-colors duration-300";

/** Structured form controls for editing a tailored resume without raw Markdown syntax. */
export function TailoredResumeStructuredForm({
  doc,
  onDocChange,
}: TailoredResumeStructuredFormProps) {
  const t = useTranslations("jobDetail");

  const experienceItems: ExperienceItem[] = doc.experience.map((r) => ({
    title: r.title,
    company: r.company,
    startDate: r.period,
    endDate: "",
    bullets: r.bullets.length > 0 ? r.bullets : [""],
  }));

  const educationItems: EducationItem[] = doc.education.map((e) => ({
    degree: e.degree,
    institution: e.institution,
    field: "",
    startDate: "",
    endDate: e.period,
  }));

  const handleExperienceChange = (items: ExperienceItem[]) => {
    onDocChange({
      ...doc,
      experience: items.map((item) => ({
        title: item.title,
        company: item.company,
        period: item.startDate || item.endDate || "",
        bullets: item.bullets,
      })),
    });
  };

  const handleEducationChange = (items: EducationItem[]) => {
    onDocChange({
      ...doc,
      education: items.map((item) => ({
        degree: item.degree,
        institution: item.institution,
        period: item.endDate || item.startDate || "",
      })),
    });
  };

  return (
    <div className="space-y-5">
      {/* Header Identity */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="space-y-1">
          <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
            {t("fieldFullName")}
          </label>
          <input
            type="text"
            value={doc.fullName}
            onChange={(e) => onDocChange({ ...doc, fullName: e.target.value })}
            placeholder={t("fieldFullNamePlaceholder")}
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
            {t("fieldHeadline")}
          </label>
          <input
            type="text"
            value={doc.headline}
            onChange={(e) => onDocChange({ ...doc, headline: e.target.value })}
            placeholder={t("fieldHeadlinePlaceholder")}
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
            {t("fieldContact")}
          </label>
          <input
            type="text"
            value={doc.contactLine}
            onChange={(e) => onDocChange({ ...doc, contactLine: e.target.value })}
            placeholder={t("fieldContactPlaceholder")}
            className={inputClass}
          />
        </div>
      </div>

      {/* Summary */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">
          {t("summary")}
        </label>
        <textarea
          rows={7}
          value={doc.summary}
          onChange={(e) => onDocChange({ ...doc, summary: e.target.value })}
          className="w-full min-h-40 resize-y bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 text-base sm:text-[13px] p-3.5 rounded-xl focus:outline-none focus:border-blue-500 shadow-2xs leading-relaxed transition-colors duration-300"
        />
      </div>

      {/* Core Skills */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">
          {t("skillsSectionHeading")}
        </label>
        <textarea
          rows={4}
          value={doc.skillsText}
          onChange={(e) => onDocChange({ ...doc, skillsText: e.target.value })}
          placeholder="Core Stack: TypeScript, React, Next.js, PostgreSQL"
          className="w-full min-h-24 resize-y bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 text-base sm:text-xs p-3 rounded-xl focus:outline-none focus:border-blue-500 shadow-2xs leading-relaxed transition-colors duration-300"
        />
      </div>

      {/* Experience & Education (reusing profile editors) */}
      <ExperienceEditor
        experiences={experienceItems}
        onChange={handleExperienceChange}
      />

      <EducationEditor
        education={educationItems}
        onChange={handleEducationChange}
      />

      {/* Certifications & Languages */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">
            {t("certificationsHeading")}
          </label>
          <textarea
            rows={2}
            value={doc.certifications.join("\n")}
            onChange={(e) =>
              onDocChange({
                ...doc,
                certifications: e.target.value.split("\n"),
              })
            }
            placeholder={t("certificationsPlaceholder")}
            className="w-full bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 text-base sm:text-xs p-2.5 rounded-xl focus:outline-none focus:border-blue-500 shadow-2xs transition-colors duration-300"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">
            {t("languagesHeading")}
          </label>
          <input
            type="text"
            value={doc.languages.join(" | ")}
            onChange={(e) =>
              onDocChange({
                ...doc,
                languages: e.target.value
                  .split("|")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            placeholder="English (Native) | French (Fluent)"
            className={inputClass}
          />
        </div>
      </div>
    </div>
  );
}
