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
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400">
          {t("educationHeading")}
        </h4>
        <button
          type="button"
          onClick={handleAddEdu}
          className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
        >
          {t("addEducation")}
        </button>
      </div>

      <div className="space-y-2.5">
        {education.map((edu, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1">
              <input
                type="text"
                placeholder={t("degreePlaceholder")}
                value={edu.degree}
                onChange={(e) => handleUpdateEdu(idx, "degree", e.target.value)}
                className="bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 text-xs p-2.5 rounded-xl font-bold text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 shadow-2xs"
              />
              <input
                type="text"
                placeholder={t("institutionPlaceholder")}
                value={edu.institution}
                onChange={(e) => handleUpdateEdu(idx, "institution", e.target.value)}
                className="bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 text-xs p-2.5 rounded-xl text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500 shadow-2xs"
              />
              <input
                type="text"
                placeholder={t("yearPlaceholder")}
                value={edu.endDate || edu.startDate || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!edu.endDate && edu.startDate) {
                    handleUpdateEdu(idx, "startDate", val);
                  } else {
                    handleUpdateEdu(idx, "endDate", val);
                  }
                }}
                className="bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 text-xs p-2.5 rounded-xl text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500 shadow-2xs"
              />
            </div>
            <button
              type="button"
              onClick={() => handleRemoveEdu(idx)}
              className="text-slate-400 hover:text-rose-500 text-xs p-1.5 cursor-pointer transition"
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
