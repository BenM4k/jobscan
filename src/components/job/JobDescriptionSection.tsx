"use client";

import React from "react";
import { useTranslations } from "next-intl";

interface JobDescriptionSectionProps {
  description?: string | null;
}

export function JobDescriptionSection({ description }: JobDescriptionSectionProps) {
  const isHtml = description && description.includes("<");
  const t = useTranslations("jobDetail");

  return (
    <section
      aria-labelledby="job-description-heading"
      className="bg-white dark:bg-[#121215] border border-slate-300 dark:border-zinc-800 p-6 sm:p-8 rounded-3xl shadow-sm space-y-4"
    >
      <h2
        id="job-description-heading"
        className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300"
      >
        {t("jobDescriptionHeading")}
      </h2>

      {isHtml ? (
        <div
          className="text-xs sm:text-sm text-gray-700 dark:text-slate-300 bg-gray-50/80 dark:bg-[#0E0E12] p-5 sm:p-7 rounded-2xl border border-gray-200 dark:border-zinc-800 leading-relaxed font-sans [&_h1]:text-base [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1 [&_p]:mb-3.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3.5 [&_li]:mb-1.5 [&_a]:text-blue-600 [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: description }}
        />
      ) : (
        <div className="text-xs sm:text-sm text-gray-700 dark:text-slate-300 bg-gray-50/80 dark:bg-[#0E0E12] p-5 sm:p-7 rounded-2xl border border-gray-200 dark:border-zinc-800 leading-relaxed space-y-3 font-sans">
          {description
            ? description
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean)
                .map((paragraph, index) => (
                  <p key={index} className="leading-relaxed">
                    {paragraph}
                  </p>
                ))
            : "No full description provided for this posting."}
        </div>
      )}
    </section>
  );
}
