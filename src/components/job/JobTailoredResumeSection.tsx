"use client";

import React, { useState } from "react";
import { JobSelect } from "@/dal/jobs.dal";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

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

  const handleDownloadPdf = (content: string) => {
    import("jspdf").then(({ jsPDF }) => {
      const doc = new jsPDF();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);

      const splitText = doc.splitTextToSize(content, 180);
      let cursorY = 15;

      splitText.forEach((line: string) => {
        if (cursorY > 280) {
          doc.addPage();
          cursorY = 15;
        }
        doc.text(line, 15, cursorY);
        cursorY += 5.5;
      });

      doc.save(`Tailored_Resume_${job.company.replace(/\s+/g, "_")}.pdf`);
      toast.success("PDF downloaded!");
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editedResume || job.tailoredResume || "");
    setIsCopied(true);
    toast.success("Tailored resume copied to clipboard!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <section aria-labelledby="tailored-resume-heading" className="bg-white dark:bg-[#121215] border border-slate-300 dark:border-zinc-800 p-6 sm:p-8 rounded-3xl shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 id="tailored-resume-heading" className="text-base font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <span>📄</span>
            <span>{t("tailoredResumeHeading")}</span>
          </h3>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
            {t("tailoredResumeSubtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {job.tailoredResume ? (
            <>
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-slate-200 text-xs font-bold px-3 py-1.5 rounded-xl transition border border-slate-200 dark:border-zinc-700 cursor-pointer"
              >
                {isEditing ? tCommon("save") : `✏️ ${tCommon("edit")}`}
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-slate-200 text-xs font-bold px-3 py-1.5 rounded-xl transition border border-slate-200 dark:border-zinc-700 cursor-pointer"
              >
                {isCopied ? `✓ ${tCommon("copied")}` : `📋 ${tCommon("copy")}`}
              </button>

              <button
                type="button"
                onClick={() => handleDownloadPdf(editedResume || job.tailoredResume!)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition shadow-xs cursor-pointer"
              >
                📥 {tCommon("downloadPdf")}
              </button>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 text-xs font-bold px-3.5 py-1.5 rounded-xl transition disabled:opacity-50 cursor-pointer"
              >
                {isGenerating ? "..." : t("reTailor")}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-md shadow-emerald-500/20 disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                  <span>{t("generatingResume")}</span>
                </>
              ) : (
                <>
                  <span>✦</span>
                  <span>{t("generateResume")}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {job.tailoredResume && (
        <div className="space-y-3">
          {isEditing ? (
            <textarea
              rows={16}
              value={editedResume}
              onChange={(e) => setEditedResume(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#18181D] border border-slate-300 dark:border-zinc-800 text-gray-900 dark:text-slate-100 p-4 rounded-2xl text-xs font-mono leading-relaxed focus:outline-none focus:border-emerald-500"
            />
          ) : (
            <div className="p-5 sm:p-6 bg-slate-50/80 dark:bg-[#141418] border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl">
              <pre className="text-xs sm:text-sm text-gray-800 dark:text-zinc-200 whitespace-pre-wrap font-mono leading-relaxed selection:bg-emerald-500 selection:text-white">
                {editedResume || job.tailoredResume}
              </pre>
            </div>
          )}
          <p className="text-[11px] text-gray-600 dark:text-zinc-300 font-medium italic">
            ℹ️ {tCommon("aiNotice")}
          </p>
        </div>
      )}
    </section>
  );
}
