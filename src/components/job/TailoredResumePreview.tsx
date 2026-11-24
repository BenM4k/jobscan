"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { parseTailoredResumeDocument } from "@/lib/tailored-resume-document";

interface TailoredResumePreviewProps {
  content: string;
}

/** Renders the complete tailored resume document without truncation in Jobpilot's editorial style. */
export function TailoredResumePreview({ content }: TailoredResumePreviewProps) {
  const t = useTranslations("jobDetail");
  const doc = parseTailoredResumeDocument(content);

  return (
    <div className="space-y-4 text-sm leading-relaxed text-gray-600 dark:text-zinc-300 font-sans">
      {(doc.fullName || doc.headline || doc.contactLine) && (
        <div className="space-y-0.5 pb-2 border-b border-border/40">
          {doc.fullName && (
            <div className="text-base font-semibold text-foreground dark:text-zinc-100">
              {doc.fullName}
            </div>
          )}
          {doc.headline && (
            <div className="text-xs font-medium text-foreground/85 dark:text-zinc-200">
              {doc.headline}
            </div>
          )}
          {doc.contactLine && (
            <div className="text-xs text-muted-foreground">{doc.contactLine}</div>
          )}
        </div>
      )}

      {doc.summary && (
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-foreground dark:text-zinc-100">
            {t("summary")}
          </div>
          <p className="whitespace-pre-line">{doc.summary}</p>
        </div>
      )}

      {doc.skillsText && (
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-foreground dark:text-zinc-100">
            {t("skillsSectionHeading")}
          </div>
          <div className="space-y-1 whitespace-pre-line text-xs sm:text-sm">
            {doc.skillsText}
          </div>
        </div>
      )}

      {doc.experience.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-foreground dark:text-zinc-100">
            {t("relevantExperience")}
          </div>
          <div className="space-y-3.5">
            {doc.experience.map((role, rIdx) => (
              <div key={rIdx} className="space-y-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="font-medium text-foreground dark:text-zinc-100">
                    {[role.title, role.company].filter(Boolean).join(" — ")}
                  </div>
                  {role.period && (
                    <span className="text-xs text-muted-foreground">
                      {role.period}
                    </span>
                  )}
                </div>
                {role.bullets.length > 0 && (
                  <ul className="list-disc pl-4 space-y-1">
                    {role.bullets.map((bullet, bIdx) => (
                      <li key={bIdx}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {doc.projects.length > 0 && (
        <div className="space-y-2.5">
          <div className="text-xs font-semibold uppercase tracking-wider text-foreground dark:text-zinc-100">
            {t("projectsHeading")}
          </div>
          {doc.projects.map((proj, pIdx) => (
            <div key={pIdx} className="space-y-1">
              {proj.name && (
                <div className="font-medium text-foreground dark:text-zinc-100">
                  {proj.name}
                </div>
              )}
              {proj.bullets.length > 0 && (
                <ul className="list-disc pl-4 space-y-1">
                  {proj.bullets.map((b, bIdx) => (
                    <li key={bIdx}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {doc.education.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-foreground dark:text-zinc-100">
            {t("educationHeading")}
          </div>
          <div className="space-y-1.5">
            {doc.education.map((edu, eIdx) => (
              <div
                key={eIdx}
                className="flex flex-wrap items-baseline justify-between gap-2"
              >
                <span className="font-medium text-foreground dark:text-zinc-100">
                  {[edu.degree, edu.institution].filter(Boolean).join(" — ")}
                </span>
                {edu.period && (
                  <span className="text-xs text-muted-foreground">{edu.period}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {doc.certifications.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-foreground dark:text-zinc-100">
            {t("certificationsHeading")}
          </div>
          <ul className="list-disc pl-4 space-y-1">
            {doc.certifications.map((cert, cIdx) => (
              <li key={cIdx}>{cert}</li>
            ))}
          </ul>
        </div>
      )}

      {doc.languages.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-foreground dark:text-zinc-100">
            {t("languagesHeading")}
          </div>
          <p>{doc.languages.join(" | ")}</p>
        </div>
      )}

      {doc.extraSections.map((sec, sIdx) => (
        <div key={sIdx} className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-foreground dark:text-zinc-100">
            {sec.heading}
          </div>
          <p className="whitespace-pre-line">{sec.content}</p>
        </div>
      ))}
    </div>
  );
}
