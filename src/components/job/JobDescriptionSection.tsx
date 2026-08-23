"use client";

import React from "react";
import { useTranslations } from "next-intl";

interface JobDescriptionSectionProps {
  description?: string | null;
}

export function JobDescriptionSection({ description }: JobDescriptionSectionProps) {
  const t = useTranslations("jobDetail");
  const isHtml = description && description.includes("<");

  return (
    <section
      aria-labelledby="job-description-heading"
      className="pt-8 border-t border-slate-200 dark:border-zinc-800/80 space-y-4"
    >
      <h2
        id="job-description-heading"
        className="text-[11px] font-mono font-semibold uppercase tracking-widest text-gray-500 dark:text-zinc-400"
      >
        {t("jobDescriptionHeading")}
      </h2>

      {isHtml ? (
        <div
          className="text-xs sm:text-sm text-gray-700 dark:text-zinc-300 leading-relaxed font-sans [&_h1]:text-base [&_h1]:font-bold [&_h1]:text-gray-900 dark:[&_h1]:text-white [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-gray-900 dark:[&_h2]:text-white [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-xs [&_h3]:font-bold [&_h3]:text-gray-900 dark:[&_h3]:text-white [&_h3]:mt-3 [&_h3]:mb-1 [&_p]:mb-3.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3.5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3.5 [&_li]:mb-1 [&_a]:text-blue-600 [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: description }}
        />
      ) : (
        <div className="text-xs sm:text-sm text-gray-700 dark:text-zinc-300 leading-relaxed space-y-3 font-sans">
          {description
            ? description
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean)
                .map((paragraph, index) => {
                  const isHeading =
                    paragraph.startsWith("Job Summary") ||
                    paragraph.startsWith("What You'll Do") ||
                    paragraph.startsWith("What You Bring") ||
                    paragraph.startsWith("Requirements") ||
                    paragraph.startsWith("Qualifications") ||
                    paragraph.startsWith("Responsibilities") ||
                    paragraph.startsWith("About ") ||
                    paragraph.endsWith(":");

                  if (isHeading) {
                    return (
                      <h3
                        key={index}
                        className="text-sm font-bold text-gray-900 dark:text-white pt-2"
                      >
                        {paragraph}
                      </h3>
                    );
                  }

                  if (paragraph.startsWith("•") || paragraph.startsWith("-") || paragraph.startsWith("*")) {
                    return (
                      <div key={index} className="flex items-start gap-2 pl-2">
                        <span className="text-blue-600 dark:text-indigo-400 font-bold shrink-0">•</span>
                        <span>{paragraph.replace(/^[•\-*]\s*/, "")}</span>
                      </div>
                    );
                  }

                  return (
                    <p key={index} className="leading-relaxed">
                      {paragraph}
                    </p>
                  );
                })
            : "No full description provided for this posting."}
        </div>
      )}
    </section>
  );
}
