"use client";

import React from "react";
import { JobSelect } from "@/dal/jobs.dal";
import { getScoreBadgeStyle } from "@/lib/score-style";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface JobDetailModalProps {
  job: JobSelect | null;
  onClose: () => void;
}

export function JobDetailModal({ job, onClose }: JobDetailModalProps) {
  const handleDownloadPdf = (content: string, filename: string) => {
    import("jspdf").then(({ jsPDF }) => {
      const doc = new jsPDF();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);

      const splitText = doc.splitTextToSize(content, 180);
      let cursorY = 15;

      splitText.forEach((line: string) => {
        if (cursorY > 280) {
          doc.addPage();
          cursorY = 15;
        }
        doc.text(line, 15, cursorY);
        cursorY += 6;
      });

      doc.save(filename);
    });
  };

  return (
    <Dialog
      open={!!job}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {job && (
        <DialogContent className="w-[95vw] max-w-3xl sm:max-w-4xl max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-8 lg:p-10 shadow-2xl">
          <DialogHeader className="border-b border-gray-100 dark:border-slate-800 pb-4 sm:pb-6 flex-shrink-0">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 pr-6 sm:pr-8">
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-slate-200 px-2.5 py-1 rounded">
                    {job.status}
                  </span>
                  <span className="text-xs text-gray-400">via {job.source}</span>
                </div>
                <DialogTitle className="font-bold text-gray-900 dark:text-slate-100 text-lg sm:text-2xl leading-snug break-words">
                  {job.title}
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 font-medium mt-1 flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span>🏢 {job.company}</span>

                  {(job.city || job.country || job.countryCode) && (
                    <span className="text-xs text-gray-600 dark:text-slate-300 font-medium bg-gray-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-lg border border-gray-200 dark:border-slate-700">
                      📍 {[job.city, job.countryCode ? job.countryCode : job.country].filter(Boolean).join(", ")}
                    </span>
                  )}

                  {job.workplaceType && (
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-lg border ${
                      job.workplaceType === "remote"
                        ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                        : job.workplaceType === "hybrid"
                        ? "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                        : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                    }`}>
                      {job.workplaceType === "remote" ? "🌐 Remote" : job.workplaceType === "hybrid" ? "⚡ Hybrid" : "🏢 On-site"}
                    </span>
                  )}

                  {job.postedAt && (
                    <span className="text-xs text-gray-500 dark:text-slate-400 font-medium bg-gray-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-lg border border-gray-200 dark:border-slate-700">
                      📅 Posted {new Date(job.postedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  )}

                  {Array.isArray(job.remoteRegions) && job.remoteRegions.length > 0 && (
                    <span className="text-[10px] font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800">
                      🌍 {job.remoteRegions.join(", ")}
                    </span>
                  )}
                </DialogDescription>
              </div>

              <a
                href={job.url}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto text-center bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-md shadow-blue-500/20 shrink-0"
              >
                Apply on Job Board ↗
              </a>
            </div>
          </DialogHeader>

          {/* Scrollable Body Wrapper with Permanent Bottom Cushion */}
          <div className="flex-1 overflow-y-auto pt-6 pb-12 pr-2 space-y-7">

            {/* Match Reasoning */}
            {job.fitScore !== null && job.fitScore !== undefined && (() => {
              const scoreStyle = getScoreBadgeStyle(job.fitScore);
              return (
                <div className={`p-6 rounded-2xl border space-y-3 ${scoreStyle.bgColor} ${scoreStyle.borderColor}`}>
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-gray-700 dark:text-slate-200">AI Match Score</span>
                    <span className={`text-lg font-extrabold ${scoreStyle.textColor}`}>{job.fitScore}/100</span>
                  </div>
                  <p className="text-xs text-gray-800 dark:text-slate-200 leading-relaxed">
                    {job.scoreReasoning}
                  </p>
                </div>
              );
            })()}

            {/* Tailored Resume Section */}
            {job.tailoredResume && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300">
                    📄 Tailored Resume
                  </h4>
                  <button
                    onClick={() =>
                      handleDownloadPdf(
                        job.tailoredResume!,
                        `Tailored_Resume_${job.company.replace(/\s+/g, "_")}.pdf`
                      )
                    }
                    className="w-full sm:w-auto text-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-md shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>📥 Download PDF</span>
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/80 text-blue-900 dark:text-blue-200 text-xs leading-relaxed flex items-start gap-3 shadow-xs">
                  <span className="text-base shrink-0">💡</span>
                  <p className="font-medium">
                    To significantly increase your chances of getting interviewed for this position, use our AI-tailored resume customized specifically to highlight key skills, metrics, and experience for this job description.
                  </p>
                </div>

                <div className="whitespace-pre-wrap text-xs text-gray-800 dark:text-slate-300 bg-gray-50 dark:bg-slate-950 p-4 sm:p-6 rounded-2xl border border-gray-200 dark:border-slate-800 font-mono leading-relaxed max-h-72 overflow-y-auto">
                  {job.tailoredResume}
                </div>
              </div>
            )}

            {/* Tailored Cover Letter */}
            {job.coverLetterDraft && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300">
                    ✉️ Tailored Cover Letter Draft
                  </h4>
                  <button
                    onClick={() =>
                      handleDownloadPdf(
                        job.coverLetterDraft!,
                        `Cover_Letter_${job.company.replace(/\s+/g, "_")}.pdf`
                      )
                    }
                    className="w-full sm:w-auto text-center justify-center bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 text-xs font-bold px-4 py-2 rounded-xl transition border border-gray-200 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>📥 Download PDF</span>
                  </button>
                </div>
                <div className="whitespace-pre-wrap text-xs text-gray-800 dark:text-slate-300 bg-gray-50 dark:bg-slate-950 p-4 sm:p-6 rounded-2xl border border-gray-200 dark:border-slate-800 font-mono leading-relaxed">
                  {job.coverLetterDraft}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300">
                Job Description & Overview
              </h4>
              {job.description && job.description.includes("<") ? (
                <div
                  className="text-xs text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-slate-950 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 leading-relaxed max-h-96 overflow-y-auto font-sans [&_h1]:text-base [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_li]:mb-1 [&_a]:text-blue-600 [&_a]:underline"
                  dangerouslySetInnerHTML={{ __html: job.description }}
                />
              ) : (
                <div className="text-xs text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-slate-950 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 leading-relaxed max-h-96 overflow-y-auto space-y-3 font-sans">
                  {job.description
                    ? job.description
                        .split("\n")
                        .map((line) => line.trim())
                        .filter(Boolean)
                        .map((paragraph, index) => (
                          <p key={index} className="leading-normal">
                            {paragraph}
                          </p>
                        ))
                    : "No full description provided for this posting."}
                </div>
              )}
            </div>

            {/* Bottom Padding Spacer */}
            <div className="h-10 aria-hidden:true" />
          </div>
        </DialogContent>
      )}



    </Dialog>
  );
}
