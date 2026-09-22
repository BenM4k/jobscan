"use client";

import React from "react";
import { EducationItem, ExperienceItem } from "@/lib/ai";
import { formatProfileDateRange } from "@/lib/date-format";
import { FileText, Briefcase, GraduationCap, Zap, Code } from "lucide-react";
import { useTranslations } from "next-intl";

interface ResumeViewerContentProps {
  summary: string;
  skills: string[];
  education: EducationItem[];
  experience: ExperienceItem[];
  rawText: string;
}

export function ResumeViewerContent({
  summary,
  skills,
  education,
  experience,
  rawText,
}: ResumeViewerContentProps) {
  const t = useTranslations("resumes.viewer");

  const hasStructuredData =
    Boolean(summary) ||
    skills.length > 0 ||
    experience.length > 0 ||
    education.length > 0;

  if (!hasStructuredData) {
    return (
      <div className="space-y-3 p-4 bg-muted/30 rounded-xl border border-border/50">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Code className="size-4" />
          <span>{t("rawContent")}</span>
        </div>
        <pre className="text-xs text-foreground font-mono whitespace-pre-wrap leading-relaxed">
          {rawText}
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      {/* Summary */}
      {summary && (
        <section className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-sans">
            <FileText className="size-3.5 text-blue-600 dark:text-blue-400" />
            <span>{t("summary")}</span>
          </h4>
          <p className="text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {summary}
          </p>
        </section>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <section className="space-y-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-sans">
            <Zap className="size-3.5 text-blue-600 dark:text-blue-400" />
            <span>{t("skills", { count: skills.length })}</span>
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((skill, i) => (
              <span
                key={`${skill}-${i}`}
                className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60"
              >
                {skill}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Experience */}
      {experience.length > 0 && (
        <section className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-sans">
            <Briefcase className="size-3.5 text-blue-600 dark:text-blue-400" />
            <span>{t("experience", { count: experience.length })}</span>
          </h4>
          <div className="space-y-4">
            {experience.map((exp, idx) => {
              const dateRange = formatProfileDateRange(
                exp.startDate,
                exp.endDate
              );
              return (
                <div
                  key={`${exp.company}-${idx}`}
                  className="p-3.5 rounded-xl bg-muted/20 border border-border/50 space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                    <h5 className="text-xs sm:text-sm font-semibold text-foreground">
                      {exp.title}{" "}
                      <span className="text-muted-foreground font-normal">
                        {t("atCompany", { company: exp.company })}
                      </span>
                    </h5>
                    {dateRange && (
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {dateRange}
                      </span>
                    )}
                  </div>
                  {exp.bullets && exp.bullets.length > 0 && (
                    <ul className="space-y-1 pl-4 list-disc text-xs text-muted-foreground leading-relaxed">
                      {exp.bullets.map((b, bIdx) => (
                        <li key={bIdx}>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Education */}
      {education.length > 0 && (
        <section className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-sans">
            <GraduationCap className="size-3.5 text-blue-600 dark:text-blue-400" />
            <span>{t("education", { count: education.length })}</span>
          </h4>
          <div className="space-y-2">
            {education.map((edu, idx) => {
              const dateRange = formatProfileDateRange(
                edu.startDate,
                edu.endDate
              );
              return (
                <div
                  key={`${edu.institution}-${idx}`}
                  className="p-3 rounded-xl bg-muted/20 border border-border/50 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1"
                >
                  <div>
                    <span className="text-xs sm:text-sm font-semibold text-foreground">
                      {edu.degree}
                      {edu.field ? ` in ${edu.field}` : ""}
                    </span>
                    <span className="text-xs text-muted-foreground block sm:inline sm:ml-2">
                      — {edu.institution}
                    </span>
                  </div>
                  {dateRange && (
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {dateRange}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
