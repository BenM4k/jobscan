"use client";

import React from "react";
import { JobSelect } from "@/dal/jobs.dal";
import { FileText, RotateCcw, Copy, Download, Edit3, Check } from "lucide-react";
import { useTailoredResume } from "./useTailoredResume";

interface JobTailoredResumeSectionProps {
  job: JobSelect;
  onJobUpdated: (updated: JobSelect) => void;
}

export function JobTailoredResumeSection({ job, onJobUpdated }: JobTailoredResumeSectionProps) {
  const {
    isGenerating,
    isEditing,
    setIsEditing,
    editedResume,
    setEditedResume,
    isCopied,
    hasResume,
    parsedResume,
    handleGenerate,
    handleDownloadPdf,
    handleCopy,
  } = useTailoredResume({ job, onJobUpdated });

  return (
    <section aria-label="Tailored resume" className="py-4 border-b border-border/40 space-y-3">
      {/* Header Row: Icon (18px) + Title (text-sm font-medium) + Description (text-sm text-muted) */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <FileText className="size-[18px] text-muted-foreground dark:text-zinc-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h2 className="text-sm font-medium text-foreground dark:text-zinc-100 font-sans">
              Tailored resume
            </h2>
            <p className="text-sm text-gray-500 dark:text-zinc-400 font-normal leading-normal font-sans">
              Align experience bullets and keywords to this role
            </p>
          </div>
        </div>

        {/* Idle State Action (Header Row Right) */}
        {!hasResume && !isGenerating && (
          <div className="shrink-0 pt-0.5">
            <button
              type="button"
              onClick={handleGenerate}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors p-0 bg-transparent border-0 cursor-pointer font-sans"
            >
              Generate resume
            </button>
          </div>
        )}
      </div>

      {/* Loading State: 3 lines low-contrast pulsing block, indented under title, no spinner icon */}
      {isGenerating && (
        <div className="ml-[30px] border-l-2 border-border dark:border-zinc-800 pl-[14px] py-1 space-y-2">
          <div className="h-3.5 w-full bg-muted dark:bg-zinc-800 animate-pulse rounded-sm" />
          <div className="h-3.5 w-5/6 bg-muted dark:bg-zinc-800 animate-pulse rounded-sm" />
          <div className="h-3.5 w-3/4 bg-muted dark:bg-zinc-800 animate-pulse rounded-sm" />
        </div>
      )}

      {/* Generated Content Block & Actions (natural auto-height, no fixed height or scroll container) */}
      {hasResume && !isGenerating && (
        <div className="space-y-3">
          {/* Content Block: indented ~30px under title, 2px border, 14px padding, text-sm font, leading-relaxed */}
          <div className="ml-[30px] border-l-2 border-border dark:border-zinc-800 pl-[14px] text-sm leading-relaxed text-gray-600 dark:text-zinc-300 font-sans">
            {isEditing ? (
              <textarea
                rows={12}
                value={editedResume}
                onChange={(e) => setEditedResume(e.target.value)}
                className="w-full bg-transparent border border-border/40 dark:border-zinc-800 text-foreground dark:text-zinc-100 p-3 rounded-none text-base sm:text-sm leading-relaxed font-sans focus:outline-none focus:border-border dark:focus:border-zinc-700"
              />
            ) : (
              <div className="space-y-3">
                {/* Summary sub-block */}
                <div>
                  <div className="text-sm font-medium text-foreground dark:text-zinc-100 font-sans">
                    Summary
                  </div>
                  <p>{parsedResume.summary}</p>
                </div>

                {/* Relevant experience sub-block */}
                {parsedResume.experience.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-foreground dark:text-zinc-100 font-sans">
                      Relevant experience
                    </div>
                    <div className="space-y-1">
                      {parsedResume.experience.map((sentence, idx) => (
                        <p key={idx}>{sentence}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Row: same left indent, responsive wrapping gaps, plain text in accent color, text-sm medium, 14px icon */}
          <div className="ml-[30px] flex flex-wrap items-center gap-x-4 gap-y-2.5 sm:gap-[16px]">
            <button
              type="button"
              onClick={handleCopy}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1.5 p-0 bg-transparent border-0 cursor-pointer font-sans"
            >
              {isCopied ? (
                <Check className="size-[14px] shrink-0" />
              ) : (
                <Copy className="size-[14px] shrink-0" />
              )}
              <span>{isCopied ? "Copied" : "Copy text"}</span>
            </button>

            <button
              type="button"
              onClick={() => handleDownloadPdf(editedResume || job.tailoredResume!)}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1.5 p-0 bg-transparent border-0 cursor-pointer font-sans"
            >
              <Download className="size-[14px] shrink-0" />
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1.5 p-0 bg-transparent border-0 cursor-pointer font-sans"
            >
              <Edit3 className="size-[14px] shrink-0" />
              <span>{isEditing ? "Save draft" : "Edit resume"}</span>
            </button>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1.5 p-0 bg-transparent border-0 cursor-pointer disabled:opacity-50 font-sans"
            >
              <RotateCcw className="size-[14px] shrink-0" />
              <span>Regenerate resume</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
