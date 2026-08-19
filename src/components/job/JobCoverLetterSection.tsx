"use client";

import React, { useState } from "react";
import { JobSelect } from "@/dal/jobs.dal";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

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
    <section aria-labelledby="cover-letter-heading" className="bg-white dark:bg-[#121215] border border-slate-300 dark:border-zinc-800 p-6 sm:p-8 rounded-3xl shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 id="cover-letter-heading" className="text-base font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <span>✉️</span>
            <span>{t("coverLetterHeading")}</span>
          </h3>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
            {t("coverLetterSubtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {coverLetter ? (
            <>
              <button
                type="button"
                onClick={handleCopy}
                className="bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-slate-200 text-xs font-bold px-3 py-1.5 rounded-xl transition border border-slate-200 dark:border-zinc-700 cursor-pointer"
              >
                {isCopied ? `✓ ${tCommon("copied")}` : `📋 ${tCommon("copy")}`}
              </button>

              <button
                type="button"
                onClick={() => handleDownloadPdf(coverLetter)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition shadow-xs cursor-pointer"
              >
                📥 {tCommon("downloadPdf")}
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || isStreaming}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? t("saving") : `💾 ${t("saveCoverLetter")}`}
              </button>

              <button
                type="button"
                onClick={handleGenerateStream}
                disabled={isStreaming}
                className="bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 text-xs font-bold px-3.5 py-1.5 rounded-xl transition disabled:opacity-50 cursor-pointer"
              >
                {isStreaming ? "..." : t("reStream")}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleGenerateStream}
              disabled={isStreaming}
              className="bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-md shadow-blue-500/20 disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
            >
              {isStreaming ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                  <span>{t("streamingCoverLetter")}</span>
                </>
              ) : (
                <>
                  <span>✦</span>
                  <span>{t("generateCoverLetter")}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Visible AI Notice */}
      <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2.5 font-medium shadow-xs">
        <span>⚠️</span>
        <span>{tCommon("aiNotice")}</span>
      </div>

      {(coverLetter || isStreaming) && (
        <div className="pt-2">
          <textarea
            rows={12}
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            placeholder={isStreaming ? "Streaming live cover letter response from Gemini 3.6 Flash..." : "Your cover letter draft..."}
            className="w-full bg-slate-50 dark:bg-[#0E0E12] border border-slate-300 dark:border-zinc-800 text-gray-900 dark:text-slate-100 text-xs font-sans rounded-2xl p-5 leading-relaxed focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 shadow-inner"
          />
        </div>
      )}
    </section>
  );
}
