"use client";

import React, { useState } from "react";
import { JobSelect } from "@/dal/jobs.dal";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import posthog from "posthog-js";

interface JobCoverLetterSectionProps {
  job: JobSelect;
  onJobUpdated: (updated: JobSelect) => void;
}

export function JobCoverLetterSection({ job, onJobUpdated }: JobCoverLetterSectionProps) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [coverLetter, setCoverLetter] = useState(job.coverLetterDraft || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const t = useTranslations("jobDetail");
  const tCommon = useTranslations("common");

  const handleGenerateStream = async () => {
    try {
      setIsStreaming(true);
      setCoverLetter("");

      const res = await fetch(`/api/jobs/${job.id}/cover-letter`, {
        method: "POST",
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to generate cover letter stream");
      }

      if (!res.body) throw new Error("No readable stream response received");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setCoverLetter(accumulated);
      }

      posthog.capture("cover_letter_generated");
      toast.success("Cover letter generated! Feel free to edit and save.");
      onJobUpdated({ ...job, coverLetterDraft: accumulated });
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Cover letter streaming failed");
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const res = await fetch(`/api/jobs/${job.id}/cover-letter`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverLetter }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to save cover letter");
      }

      const { data } = await res.json();
      posthog.capture("cover_letter_saved");
      onJobUpdated(data);
      toast.success("Cover letter saved successfully!");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPdf = (content: string) => {
    import("jspdf").then(({ jsPDF }) => {
      const doc = new jsPDF();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);

      const splitText = doc.splitTextToSize(content, 180);
      let cursorY = 20;

      splitText.forEach((line: string) => {
        if (cursorY > 275) {
          doc.addPage();
          cursorY = 20;
        }
        doc.text(line, 15, cursorY);
        cursorY += 6;
      });

      doc.save(`Cover_Letter_${job.company.replace(/\s+/g, "_")}.pdf`);
      toast.success("Cover letter PDF downloaded!");
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(coverLetter);
    setIsCopied(true);
    toast.success("Cover letter copied to clipboard!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <section aria-labelledby="cover-letter-heading" className="space-y-3">
      {/* Main Row */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-base text-purple-600 dark:text-purple-400">✉</span>
            <h3
              id="cover-letter-heading"
              className="text-sm sm:text-base font-bold text-gray-900 dark:text-white"
            >
              {t("coverLetterHeading")}
            </h3>
          </div>
          <p className="text-xs text-gray-600 dark:text-zinc-400 max-w-xl leading-relaxed">
            {t("coverLetterSubtitle")}
          </p>

          {/* AI Notice Banner right under description */}
          <div className="inline-flex items-center gap-1.5 p-1.5 px-3 rounded-md bg-[#fef2f2] dark:bg-rose-950/30 border border-[#fecaca] dark:border-rose-900/50 text-[#dc2626] dark:text-rose-300 font-mono text-[11px] mt-1.5">
            <span>⚠</span>
            <span>{tCommon("aiNotice")}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {coverLetter ? (
            <>
              <button
                type="button"
                onClick={handleCopy}
                className="bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-xl transition border border-slate-200 dark:border-zinc-700 cursor-pointer"
              >
                {isCopied ? `✓ ${tCommon("copied")}` : `📋 ${tCommon("copy")}`}
              </button>

              <button
                type="button"
                onClick={() => handleDownloadPdf(coverLetter)}
                className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-semibold px-3.5 py-1.5 rounded-xl transition shadow-xs cursor-pointer"
              >
                📥 {tCommon("downloadPdf")}
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || isStreaming}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-1.5 rounded-xl transition disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? t("saving") : `💾 ${t("saveCoverLetter")}`}
              </button>

              <button
                type="button"
                onClick={handleGenerateStream}
                disabled={isStreaming}
                className="bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 text-xs font-semibold px-3.5 py-1.5 rounded-xl transition disabled:opacity-50 cursor-pointer"
              >
                {isStreaming ? "..." : t("reStream")}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleGenerateStream}
              disabled={isStreaming}
              className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              {isStreaming ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  <span>{t("streamingCoverLetter")}</span>
                </>
              ) : (
                <>
                  <span>+</span>
                  <span>Generate Cover Letter</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {(coverLetter || isStreaming) && (
        <div className="pt-2">
          <textarea
            rows={12}
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            placeholder={isStreaming ? "Streaming live cover letter response from Gemini 3.6 Flash..." : "Your cover letter draft..."}
            className="w-full bg-slate-50 dark:bg-[#0E0E12] border border-slate-300 dark:border-zinc-800 text-gray-900 dark:text-slate-100 text-xs font-sans rounded-2xl p-5 leading-relaxed focus:outline-none focus:border-purple-500 focus-visible:ring-2 focus-visible:ring-purple-500/20 shadow-inner"
          />
        </div>
      )}
    </section>
  );
}
