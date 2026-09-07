"use client";

import React from "react";
import { AlignLeft } from "lucide-react";

interface JobDescriptionSectionProps {
  description?: string | null;
}

export function JobDescriptionSection({ description }: JobDescriptionSectionProps) {
  const isHtml = description && description.includes("<");

  return (
    <section aria-label="Job description" className="py-4 space-y-3">
      {/* Header Row: Icon (18px) + Title (text-sm font-medium) + Description (text-sm text-muted) */}
      <div className="flex items-start gap-3">
        <AlignLeft className="size-[18px] text-muted-foreground dark:text-zinc-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <h2 className="text-sm font-medium text-foreground dark:text-zinc-100 font-sans">
            Job description
          </h2>
          <p className="text-sm text-gray-500 dark:text-zinc-400 font-normal leading-normal font-sans">
            Role overview, qualifications, and core responsibilities
          </p>
        </div>
      </div>

      {/* Content Block: indented ~30px under title, 2px border, 14px padding, text-sm font, leading-relaxed, capped height with auto overflow */}
      <div className="ml-[30px] border-l-2 border-border dark:border-zinc-800 pl-[14px] pr-3 text-sm leading-relaxed text-gray-600 dark:text-zinc-300 max-h-[420px] overflow-y-auto font-sans break-words min-w-0">
        {isHtml ? (
          <div
            className="leading-relaxed font-sans break-words min-w-0 [&_h1]:text-sm [&_h1]:font-medium [&_h1]:text-foreground dark:[&_h1]:text-zinc-100 [&_h1]:mt-3 [&_h1]:mb-1 [&_h2]:text-sm [&_h2]:font-medium [&_h2]:text-foreground dark:[&_h2]:text-zinc-100 [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-medium [&_h3]:text-foreground dark:[&_h3]:text-zinc-100 [&_h3]:mt-3 [&_h3]:mb-1 [&_p]:mb-2.5 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:mb-2.5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:mb-2.5 [&_li]:mb-0.5 [&_a]:text-blue-600 dark:[&_a]:text-blue-400 [&_a]:underline [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_table]:overflow-x-auto [&_table]:max-w-full"
            dangerouslySetInnerHTML={{ __html: description }}
          />
        ) : (
          <div className="space-y-3 font-sans">
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
                          className="text-sm font-medium text-foreground dark:text-zinc-100 pt-1 font-sans"
                        >
                          {paragraph}
                        </h3>
                      );
                    }

                    if (paragraph.startsWith("•") || paragraph.startsWith("-") || paragraph.startsWith("*")) {
                      return (
                        <div key={index} className="flex items-start gap-2">
                          <span className="text-muted-foreground/60 dark:text-zinc-500 shrink-0">•</span>
                          <span>{paragraph.replace(/^[•\-*]\s*/, "")}</span>
                        </div>
                      );
                    }

                    return (
                      <p key={index} className="leading-relaxed font-sans">
                        {paragraph}
                      </p>
                    );
                  })
              : "No full description provided for this posting."}
          </div>
        )}
      </div>
    </section>
  );
}
