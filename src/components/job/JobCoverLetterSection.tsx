"use client";

import React from "react";
import { JobSelect } from "@/dal/jobs.dal";
import { Mail, RotateCcw, Copy, Download, Edit3, Save, Check } from "lucide-react";
import { useCoverLetter } from "./useCoverLetter";

interface JobCoverLetterSectionProps {
  job: JobSelect;
  onJobUpdated: (updated: JobSelect) => void;
}

export function JobCoverLetterSection({ job, onJobUpdated }: JobCoverLetterSectionProps) {
  const {
    isStreaming,
    coverLetter,
    setCoverLetter,
    isSaving,
    isEditing,
    setIsEditing,
    isCopied,
    hasContent,
    handleGenerateStream,
    handleSave,
    handleDownloadPdf,
    handleCopy,
  } = useCoverLetter({ job, onJobUpdated });

  const isIdle = !hasContent && !isStreaming;
  const isLoading = isStreaming && !coverLetter;
  const isGeneratedOrStreaming = hasContent || (isStreaming && Boolean(coverLetter));

  return (
    <section aria-label="Tailored cover letter" className="py-4 border-b border-border/40 space-y-3">
      {/* Header Row: Icon (18px) + Title (text-sm font-medium) + Description (text-sm text-muted) */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Mail className="size-[18px] text-muted-foreground dark:text-zinc-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h2 className="text-sm font-medium text-foreground dark:text-zinc-100 font-sans">
              Tailored cover letter
            </h2>
            <p className="text-sm text-gray-500 dark:text-zinc-400 font-normal leading-normal font-sans">
              Draft a targeted letter tailored to this position
            </p>
          </div>
        </div>

        {/* Idle State Action (Header Row Right) */}
        {isIdle && (
          <div className="shrink-0 pt-0.5">
            <button
              type="button"
              onClick={handleGenerateStream}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors p-0 bg-transparent border-0 cursor-pointer font-sans"
            >
              Generate cover letter
            </button>
          </div>
        )}
      </div>

      {/* Loading State: 3 lines low-contrast pulsing block, indented under title, no spinner icon */}
      {isLoading && (
        <div className="ml-[30px] border-l-2 border-border dark:border-zinc-800 pl-[14px] py-1 space-y-2">
          <div className="h-3.5 w-full bg-muted dark:bg-zinc-800 animate-pulse rounded-sm" />
          <div className="h-3.5 w-5/6 bg-muted dark:bg-zinc-800 animate-pulse rounded-sm" />
          <div className="h-3.5 w-3/4 bg-muted dark:bg-zinc-800 animate-pulse rounded-sm" />
        </div>
      )}

      {/* Generated or Live Streaming Content Block & Actions */}
      {isGeneratedOrStreaming && (
        <div className="space-y-3">
          {/* Content Block: indented ~30px under title, 2px border, 14px padding, text-sm font, leading-relaxed, single paragraph */}
          <div className="ml-[30px] border-l-2 border-border dark:border-zinc-800 pl-[14px] text-sm leading-relaxed text-gray-600 dark:text-zinc-300 font-sans">
            {isEditing ? (
              <textarea
                rows={10}
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                className="w-full bg-transparent border border-border/40 dark:border-zinc-800 text-foreground dark:text-zinc-100 p-3 rounded-none text-base sm:text-sm leading-relaxed font-sans focus:outline-none focus:border-border dark:focus:border-zinc-700"
              />
            ) : (
              <p className="whitespace-pre-line leading-relaxed font-sans">{coverLetter}</p>
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
              onClick={handleDownloadPdf}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1.5 p-0 bg-transparent border-0 cursor-pointer font-sans"
            >
              <Download className="size-[14px] shrink-0" />
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (isEditing) {
                  handleSave();
                }
                setIsEditing(!isEditing);
              }}
              disabled={isSaving}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1.5 p-0 bg-transparent border-0 cursor-pointer disabled:opacity-50 font-sans"
            >
              {isEditing ? (
                <Save className="size-[14px] shrink-0" />
              ) : (
                <Edit3 className="size-[14px] shrink-0" />
              )}
              <span>{isEditing ? (isSaving ? "Saving" : "Save draft") : "Edit draft"}</span>
            </button>

            <button
              type="button"
              onClick={handleGenerateStream}
              disabled={isStreaming}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1.5 p-0 bg-transparent border-0 cursor-pointer disabled:opacity-50 font-sans"
            >
              <RotateCcw className="size-[14px] shrink-0" />
              <span>Regenerate letter</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
