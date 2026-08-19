"use client";

import React from "react";
import { ExperienceItem } from "@/lib/ai";
import { useTranslations } from "next-intl";

interface ExperienceEditorProps {
  experiences: ExperienceItem[];
  onChange: (items: ExperienceItem[]) => void;
}

export function ExperienceEditor({ experiences, onChange }: ExperienceEditorProps) {
  const t = useTranslations("profile");

  const handleAddRole = () => {
    onChange([
      ...experiences,
      { company: "", title: "", startDate: "", endDate: "", bullets: [""] },
    ]);
  };

  const handleRemoveRole = (index: number) => {
    onChange(experiences.filter((_, i) => i !== index));
  };

  const handleUpdateRole = (index: number, field: keyof ExperienceItem, value: unknown) => {
    const updated = [...experiences];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const handleBulletChange = (roleIndex: number, bulletIndex: number, value: string) => {
    const updated = [...experiences];
    const newBullets = [...updated[roleIndex].bullets];
    newBullets[bulletIndex] = value;
    updated[roleIndex] = { ...updated[roleIndex], bullets: newBullets };
    onChange(updated);
  };

  const handleAddBullet = (roleIndex: number) => {
    const updated = [...experiences];
    updated[roleIndex] = {
      ...updated[roleIndex],
      bullets: [...updated[roleIndex].bullets, ""],
    };
    onChange(updated);
  };

  const handleRemoveBullet = (roleIndex: number, bulletIndex: number) => {
    const updated = [...experiences];
    updated[roleIndex] = {
      ...updated[roleIndex],
      bullets: updated[roleIndex].bullets.filter((_, i) => i !== bulletIndex),
    };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
          {t("experienceHeading")}
        </h4>
        <button
          type="button"
          onClick={handleAddRole}
          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
        >
          {t("addPosition")}
        </button>
      </div>

      <div className="space-y-4">
        {experiences.map((exp, rIdx) => (
          <div
            key={rIdx}
            className="p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-[#15151A]/50 space-y-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
                <input
                  type="text"
                  placeholder={t("jobTitlePlaceholder")}
                  value={exp.title}
                  onChange={(e) => handleUpdateRole(rIdx, "title", e.target.value)}
                  className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-xs p-2 rounded-lg font-bold"
                />
                <input
                  type="text"
                  placeholder={t("companyPlaceholder")}
                  value={exp.company}
                  onChange={(e) => handleUpdateRole(rIdx, "company", e.target.value)}
                  className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-xs p-2 rounded-lg"
                />
                <input
                  type="text"
                  placeholder={t("periodPlaceholder")}
                  value={exp.startDate || exp.endDate || ""}
                  onChange={(e) => handleUpdateRole(rIdx, "startDate", e.target.value)}
                  className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-xs p-2 rounded-lg"
                />
              </div>

              <button
                type="button"
                onClick={() => handleRemoveRole(rIdx)}
                className="text-rose-500 hover:text-rose-700 text-xs font-bold p-1 cursor-pointer"
                title="Remove Position"
              >
                ✕
              </button>
            </div>

            {/* Bullets List */}
            <div className="space-y-1.5 pl-2">
              {exp.bullets.map((bullet, bIdx) => (
                <div key={bIdx} className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs">•</span>
                  <input
                    type="text"
                    value={bullet}
                    onChange={(e) => handleBulletChange(rIdx, bIdx, e.target.value)}
                    placeholder="Describe specific achievements, responsibilities, metrics..."
                    className="flex-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-xs p-2 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveBullet(rIdx, bIdx)}
                    className="text-gray-400 hover:text-rose-500 text-xs px-1 cursor-pointer"
                    title="Remove Bullet"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => handleAddBullet(rIdx)}
                className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline pt-1 cursor-pointer"
              >
                {t("addBullet")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
