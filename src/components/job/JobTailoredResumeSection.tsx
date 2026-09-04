"use client";

import React, { useState } from "react";
import { JobSelect } from "@/dal/jobs.dal";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import posthog from "posthog-js";
import { downloadTextAsPdf } from "@/lib/pdf-export";

interface JobTailoredResumeSectionProps {
  job: JobSelect;
  onJobUpdated: (updated: JobSelect) => void;
}

export function JobTailoredResumeSection({ job, onJobUpdated }: JobTailoredResumeSectionProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedResume, setEditedResume] = useState(job.tailoredResume || "");
  const [isCopied, setIsCopied] = useState(false);
  const t = useTranslations("jobDetail");
  const tCommon = useTranslations("common");

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      const res = await fetch(`/api/jobs/${job.id}/tailor-resume`, {
        method: "POST",
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to generate tailored resume");
      }

      const { data, tailoredResume } = await res.json();
      posthog.capture("tailored_resume_generated");
      setEditedResume(tailoredResume);
      onJobUpdated(data);
      toast.success("Tailored resume generated with Gemini 3.6 Flash!");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Tailoring failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPdf = async (content: string) => {
    try {
      const filename = `Tailored_Resume_${job.company.replace(/\s+/g, "_")}.pdf`;
      await downloadTextAsPdf(filename, content, 10.5, 5.5);
      toast.success("PDF downloaded!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to download PDF");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editedResume || job.tailoredResume || "");
    setIsCopied(true);
    toast.success("Tailored resume copied to clipboard!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <section aria-labelledby="tailored-resume-heading" className="space-y-4">
      {/* Main Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-base text-gray-700 dark:text-zinc-300">📄</span>
            <h3
              id="tailored-resume-heading"
              className="text-sm sm:text-base font-bold text-gray-900 dark:text-white"
            >
              {t("tailoredResumeHeading")}
            </h3>
          </div>
          <p className="text-xs text-gray-600 dark:text-zinc-400 max-w-xl leading-relaxed">
            {t("tailoredResumeSubtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {job.tailoredResume ? (
            <>
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-xl transition border border-slate-200 dark:border-zinc-700 cursor-pointer"
              >
                {isEditing ? tCommon("save") : `✏️ ${tCommon("edit")}`}
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-xl transition border border-slate-200 dark:border-zinc-700 cursor-pointer"
              >
                {isCopied ? `✓ ${tCommon("copied")}` : `📋 ${tCommon("copy")}`}
              </button>

              <button
                type="button"
                onClick={() => handleDownloadPdf(editedResume || job.tailoredResume!)}
                className="bg-[#0e4d64] hover:bg-[#0a3849] text-white text-xs font-semibold px-3.5 py-1.5 rounded-xl transition shadow-xs cursor-pointer"
              >
                📥 {tCommon("downloadPdf")}
              </button>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 text-xs font-semibold px-3 py-1.5 rounded-xl transition disabled:opacity-50 cursor-pointer"
              >
                {isGenerating ? "..." : t("reTailor")}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="bg-[#0e4d64] hover:bg-[#0a3849] text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              {isGenerating ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  <span>{t("generatingResume")}</span>
                </>
              ) : (
                <>
                  <span>+</span>
                  <span>Generate Tailored Resume</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {job.tailoredResume && (
        <div className="space-y-3 pt-2">
          {isEditing ? (
            <textarea
              rows={16}
              value={editedResume}
              onChange={(e) => setEditedResume(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#18181D] border border-slate-300 dark:border-zinc-800 text-gray-900 dark:text-slate-100 p-4 rounded-2xl text-xs font-mono leading-relaxed focus:outline-none focus:border-cyan-600"
            />
          ) : (
            <div className="p-5 sm:p-6 bg-slate-50/80 dark:bg-[#141418] border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl">
              <pre className="text-xs sm:text-sm text-gray-800 dark:text-zinc-200 whitespace-pre-wrap font-mono leading-relaxed selection:bg-cyan-600 selection:text-white">
                {editedResume || job.tailoredResume}
              </pre>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
