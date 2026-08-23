"use client";

import React from "react";
import { EducationItem, ExperienceItem } from "@/lib/ai";
import { ProfileHeader } from "./ProfileHeader";
import { FileText, Briefcase, GraduationCap, Zap } from "lucide-react";
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
      className="flex-1 min-w-0 divide-y divide-slate-200/90 dark:divide-zinc-800"
    >
      {/* Top Header */}
      <div className="pb-8 sm:pb-10">
        <ProfileHeader
          name={name}
          headline={headline}
          location={location}
          onEditClick={onEditClick}
          onReformatClick={onReformatClick}
          onDeleteClick={onDeleteClick}
          isReformatting={isReformatting}
        />
      </div>

      {/* Professional Summary Section */}
      {displaySummary && (
        <section aria-labelledby="summary-heading" className="py-8 sm:py-10 space-y-4">
          <h2
            id="summary-heading"
            className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400 flex items-center gap-2 font-mono"
          >
            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{t("summaryHeading")}</span>
          </h2>
          <p className="text-xs sm:text-[13px] text-slate-700 dark:text-zinc-300 leading-relaxed max-w-3xl whitespace-pre-wrap font-normal">
            {displaySummary}
          </p>
        </section>
      )}

      {/* Experience Section */}
      <section aria-labelledby="experience-heading" className="py-8 sm:py-10 space-y-6">
        <h2
          id="experience-heading"
          className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400 flex items-center gap-2 font-mono"
        >
          <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>{t("experienceHeading")} ({experience.length})</span>
        </h2>

        {experience.length > 0 ? (
          <div className="space-y-8 sm:space-y-9 pt-1">
            {experience.map((exp, idx) => {
              const isFirst = idx === 0;
              return (
                <div key={idx} className="relative pl-6 space-y-2">
                  {/* Left indicator bullet / diamond */}
                  <span
                    aria-hidden="true"
                    className={`absolute left-0 top-0.5 text-[11px] select-none ${
                      isFirst ? "text-indigo-600 dark:text-indigo-400 font-black" : "text-slate-300 dark:text-zinc-600 font-bold"
                    }`}
                  >
                    ◆
                  </span>

                  {/* Header Row: Title & Date Range */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-baseline gap-1">
                    <h3 className="text-sm sm:text-[15px] font-bold text-slate-900 dark:text-zinc-100">
                      {exp.title}
                    </h3>
                    {(exp.startDate || exp.endDate) && (
                      <span className="text-[10px] sm:text-[11px] text-slate-400 dark:text-zinc-500 font-mono uppercase tracking-wider">
                        {[exp.startDate, exp.endDate].filter(Boolean).join(" — ")}
                      </span>
                    )}
                  </div>

                  {/* Company Row */}
                  {exp.company && (
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#6366F1] dark:text-indigo-400">
                      {exp.company}
                    </p>
                  )}

                  {/* Bullet Points */}
                  {exp.bullets?.length > 0 && (
                    <ul className="list-disc pl-4 space-y-1.5 text-xs sm:text-[13px] text-slate-600 dark:text-zinc-300 leading-relaxed pt-1">
                      {exp.bullets.map((bullet, bIdx) => (
                        <li key={bIdx}>{bullet}</li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">No work experience recorded yet.</p>
        )}
      </section>

      {/* Education Section */}
      {education.length > 0 && (
        <section aria-labelledby="education-heading" className="py-8 sm:py-10 space-y-6">
          <h2
            id="education-heading"
            className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400 flex items-center gap-2 font-mono"
          >
            <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{t("educationHeading")} ({education.length})</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-8 pt-1">
            {education.map((edu, idx) => (
              <div key={idx} className="space-y-1.5">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100 leading-snug">
                  {edu.degree} {edu.field ? `in ${edu.field}` : ""}
                </h3>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6366F1] dark:text-indigo-400">
                  {edu.institution}
                </p>
                {(edu.startDate || edu.endDate) && (
                  <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono uppercase tracking-wider">
                    {[edu.startDate, edu.endDate].filter(Boolean).join(" — ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills Section */}
      <section aria-labelledby="skills-heading" className="pt-8 sm:pt-10 space-y-4">
        <h2
          id="skills-heading"
          className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400 flex items-center gap-2 font-mono"
        >
          <Zap className="w-3.5 h-3.5 text-cyan-500 shrink-0 fill-cyan-500/20" />
          <span>{t("skillsHeading")} ({skills.length})</span>
        </h2>
        <div className="flex flex-wrap gap-2 pt-1">
          {skills.length > 0 ? (
            skills.map((skill, idx) => (
              <span
                key={idx}
                className="text-[11px] bg-slate-100/80 dark:bg-zinc-800/70 border border-slate-200 dark:border-zinc-700/60 text-slate-800 dark:text-zinc-200 px-2.5 py-1 rounded-sm font-medium shadow-2xs"
              >
                {skill}
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-400 italic">No skills listed yet.</span>
          )}
        </div>
      </section>
    </article>
  );
}
