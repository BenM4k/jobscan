"use client";

import React from "react";
import { EducationItem, ExperienceItem } from "@/lib/ai";
import { ProfileHeader } from "./ProfileHeader";
import { useTranslations } from "next-intl";

interface ProfileOverviewProps {
  name: string;
  headline: string;
  location: string;
  summary?: string;
  skills: string[];
  education?: EducationItem[];
  experience?: ExperienceItem[];
  about?: string;
  onEditClick: () => void;
  onReformatClick?: () => void;
  onDeleteClick?: () => void;
  isReformatting?: boolean;
}

export function ProfileOverview({
  name,
  headline,
  location,
  summary,
  skills,
  education = [],
  experience = [],
  about,
  onEditClick,
  onReformatClick,
  onDeleteClick,
  isReformatting = false,
}: ProfileOverviewProps) {
  const displaySummary = summary || about || "";
  const t = useTranslations("profile");

  return (
    <article
      aria-label="Candidate Profile Overview"
      className="space-y-8 flex-1 min-w-0"
    >
      {/* Top Header with User Info and Actions Dropdown */}
      <ProfileHeader
        name={name}
        headline={headline}
        location={location}
        onEditClick={onEditClick}
        onReformatClick={onReformatClick}
        onDeleteClick={onDeleteClick}
        isReformatting={isReformatting}
      />

      {/* Professional Summary Section */}
      {displaySummary && (
        <section aria-labelledby="summary-heading" className="bg-white dark:bg-[#121215] border border-slate-300 dark:border-zinc-800 p-6 sm:p-7 rounded-3xl space-y-3 shadow-xs">
          <h2
            id="summary-heading"
            className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300 flex items-center gap-2"
          >
            <span>📄</span>
            <span>{t("summaryHeading")}</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-700 dark:text-zinc-300 leading-relaxed max-w-3xl whitespace-pre-wrap font-sans">
            {displaySummary}
          </p>
        </section>
      )}

      {/* Experience Section */}
      <section aria-labelledby="experience-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2
            id="experience-heading"
            className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300 flex items-center gap-2"
          >
            <span>💼</span>
            <span>{t("experienceHeading")} ({experience.length})</span>
          </h2>
        </div>

        {experience.length > 0 ? (
          <div className="space-y-4">
            {experience.map((exp, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-[#121215] border border-slate-300 dark:border-zinc-800 p-5 sm:p-6 rounded-3xl space-y-3 shadow-xs"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 border-b border-slate-100 dark:border-zinc-800/80 pb-3">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-slate-100">
                      {exp.title}
                    </h3>
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                      {exp.company}
                    </p>
                  </div>
                  {(exp.startDate || exp.endDate) && (
                    <span className="text-[11px] text-gray-600 dark:text-zinc-400 font-mono bg-slate-100 dark:bg-zinc-800/80 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-zinc-700/60 font-semibold">
                      {[exp.startDate, exp.endDate].filter(Boolean).join(" — ")}
                    </span>
                  )}
                </div>

                {exp.bullets?.length > 0 && (
                  <ul className="list-disc pl-4 space-y-1.5 text-xs text-gray-600 dark:text-zinc-300 leading-relaxed pt-1">
                    {exp.bullets.map((bullet, bIdx) => (
                      <li key={bIdx}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-[#121215] border border-slate-300 dark:border-zinc-800 p-6 rounded-3xl text-center text-xs text-gray-400 italic">
            No work experience recorded yet.
          </div>
        )}
      </section>

      {/* Education Section */}
      {education.length > 0 && (
        <section aria-labelledby="education-heading" className="space-y-4">
          <h2
            id="education-heading"
            className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300 flex items-center gap-2"
          >
            <span>🎓</span>
            <span>{t("educationHeading")} ({education.length})</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {education.map((edu, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-[#121215] border border-slate-300 dark:border-zinc-800 p-5 rounded-3xl space-y-1.5 shadow-xs"
              >
                <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-slate-100">
                  {edu.degree} {edu.field ? `in ${edu.field}` : ""}
                </h3>
                <p className="text-xs text-gray-600 dark:text-zinc-400 font-medium">{edu.institution}</p>
                {(edu.startDate || edu.endDate) && (
                  <p className="text-[11px] text-gray-500 dark:text-zinc-500 font-mono pt-1">
                    {[edu.startDate, edu.endDate].filter(Boolean).join(" — ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills Section */}
      <section aria-labelledby="skills-heading" className="bg-white dark:bg-[#121215] border border-slate-300 dark:border-zinc-800 p-6 sm:p-7 rounded-3xl space-y-3 shadow-xs">
        <h2
          id="skills-heading"
          className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300 flex items-center gap-2"
        >
          <span>⚡</span>
          <span>{t("skillsHeading")} ({skills.length})</span>
        </h2>
        <div className="flex flex-wrap gap-2 pt-1">
          {skills.length > 0 ? (
            skills.map((skill, idx) => (
              <span
                key={idx}
                className="text-xs bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-zinc-700/80 text-gray-800 dark:text-zinc-200 px-3 py-1.5 rounded-xl font-semibold shadow-xs"
              >
                {skill}
              </span>
            ))
          ) : (
            <span className="text-xs text-gray-400 italic">No skills listed yet.</span>
          )}
        </div>
      </section>
    </article>
  );
}
