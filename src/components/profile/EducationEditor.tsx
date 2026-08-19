"use client";

import React from "react";
import { EducationItem } from "@/lib/ai";
import { useTranslations } from "next-intl";

interface EducationEditorProps {
  education: EducationItem[];
  onChange: (items: EducationItem[]) => void;
}

export function EducationEditor({ education, onChange }: EducationEditorProps) {
  const t = useTranslations("profile");

  const handleAddEdu = () => {
    onChange([
      ...education,
      { institution: "", degree: "", field: "", startDate: "", endDate: "" },
    ]);
  };

  const handleRemoveEdu = (index: number) => {
    onChange(education.filter((_, i) => i !== index));
  };

  const handleUpdateEdu = (index: number, field: keyof EducationItem, value: string) => {
    const updated = [...education];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
          {t("educationHeading")}
        </h4>
        <button
          type="button"
          onClick={handleAddEdu}
          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
        >
          {t("addEducation")}
        </button>
      </div>

      <div className="space-y-3">
        {education.map((edu, idx) => (
          <div
            key={idx}
            className="p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-[#15151A]/50 flex items-center justify-between gap-2"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
              <input
                type="text"
                placeholder={t("degreePlaceholder")}
                value={edu.degree}
                onChange={(e) => handleUpdateEdu(idx, "degree", e.target.value)}
                className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-xs p-2 rounded-lg font-bold"
              />
              <input
                type="text"
                placeholder={t("institutionPlaceholder")}
                value={edu.institution}
                onChange={(e) => handleUpdateEdu(idx, "institution", e.target.value)}
                className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-xs p-2 rounded-lg"
              />
              <input
                type="text"
                placeholder={t("yearPlaceholder")}
                value={edu.endDate || ""}
                onChange={(e) => handleUpdateEdu(idx, "endDate", e.target.value)}
                className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-xs p-2 rounded-lg"
              />
            </div>
            <button
              type="button"
              onClick={() => handleRemoveEdu(idx)}
              className="text-rose-500 hover:text-rose-700 text-xs font-bold px-2 cursor-pointer"
              title="Remove Education"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
