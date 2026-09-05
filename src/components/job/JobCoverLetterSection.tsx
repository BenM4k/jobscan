"use client";

import React, { useState } from "react";
import { JobSelect } from "@/dal/jobs.dal";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import posthog from "posthog-js";
import { CoverLetterToolbar } from "@/components/job/CoverLetterToolbar";
import { downloadTextAsPdf } from "@/lib/pdf-export";

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
      const idempotencyKey = crypto.randomUUID();

      const res = await fetch(`/api/jobs/${job.id}/cover-letter`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({ idempotencyKey }),
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

  const handleDownloadPdf = async () => {
    try {
      const filename = `Cover_Letter_${job.company.replace(/\s+/g, "_")}.pdf`;
      await downloadTextAsPdf(filename, coverLetter, 11, 6);
      toast.success("Cover letter PDF downloaded!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(coverLetter);
    setIsCopied(true);
    toast.success("Cover letter copied to clipboard!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <section aria-labelledby="cover-letter-heading" className="space-y-3">
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

          <div className="inline-flex items-center gap-1.5 p-1.5 px-3 rounded-md bg-[#fef2f2] dark:bg-rose-950/30 border border-[#fecaca] dark:border-rose-900/50 text-[#dc2626] dark:text-rose-300 font-mono text-[11px] mt-1.5">
            <span>⚠</span>
            <span>{tCommon("aiNotice")}</span>
          </div>
        </div>

        <CoverLetterToolbar
          hasContent={Boolean(coverLetter)}
          isCopied={isCopied}
          isSaving={isSaving}
          isStreaming={isStreaming}
          onCopy={handleCopy}
          onDownloadPdf={handleDownloadPdf}
          onSave={handleSave}
          onGenerateStream={handleGenerateStream}
        />
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
