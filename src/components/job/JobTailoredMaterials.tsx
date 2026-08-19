"use client";

import React, { useState } from "react";
import { JobSelect } from "@/dal/jobs.dal";
import { toast } from "sonner";

interface JobTailoredMaterialsProps {
  job: JobSelect;
}

export function JobTailoredMaterials({ job }: JobTailoredMaterialsProps) {
  const [copiedSection, setCopiedSection] = useState<"resume" | "coverLetter" | null>(null);

  if (!job.tailoredResume && !job.coverLetterDraft) {
    return null;
  }

  const handleDownloadPdf = (content: string, filename: string) => {
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

      doc.save(filename);
    });
  };

  const handleCopy = (text: string, section: "resume" | "coverLetter") => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    toast.success(`${section === "resume" ? "Resume" : "Cover Letter"} copied to clipboard!`);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Tailored Resume Section */}
      {job.tailoredResume && (
        <section aria-labelledby="tailored-resume-heading" className="space-y-3 bg-white dark:bg-[#121215] border border-slate-300 dark:border-zinc-800 p-6 sm:p-7 rounded-3xl shadow-sm">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <h2 id="tailored-resume-heading" className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300">
              📄 Tailored Resume
            </h2>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopy(job.tailoredResume!, "resume")}
                className="bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-slate-200 text-xs font-bold px-3 py-1.5 rounded-xl transition border border-slate-200 dark:border-zinc-700 flex items-center gap-1 cursor-pointer"
              >
                <span>{copiedSection === "resume" ? "✓ Copied" : "📋 Copy"}</span>
              </button>

              <button
                onClick={() =>
                  handleDownloadPdf(
                    job.tailoredResume!,
                    `Tailored_Resume_${job.company.replace(/\s+/g, "_")}.pdf`
                  )
                }
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>📥 Download PDF</span>
              </button>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/80 text-blue-900 dark:text-blue-200 text-xs leading-relaxed flex items-start gap-3 shadow-xs">
            <span className="text-base shrink-0">💡</span>
            <p className="font-medium">
              To significantly increase your chances of getting interviewed for this position, use our AI-tailored resume customized specifically to highlight key skills, metrics, and experience for this job description.
            </p>
          </div>

          <div className="whitespace-pre-wrap text-xs text-gray-800 dark:text-slate-300 bg-gray-50 dark:bg-[#0E0E12] p-4 sm:p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 font-mono leading-relaxed max-h-96 overflow-y-auto">
            {job.tailoredResume}
          </div>
        </section>
      )}

      {/* Tailored Cover Letter */}
      {job.coverLetterDraft && (
        <section aria-labelledby="tailored-cover-letter-heading" className="space-y-3 bg-white dark:bg-[#121215] border border-slate-300 dark:border-zinc-800 p-6 sm:p-7 rounded-3xl shadow-sm">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <h2 id="tailored-cover-letter-heading" className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300">
              ✉️ Tailored Cover Letter Draft
            </h2>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopy(job.coverLetterDraft!, "coverLetter")}
                className="bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-slate-200 text-xs font-bold px-3 py-1.5 rounded-xl transition border border-slate-200 dark:border-zinc-700 flex items-center gap-1 cursor-pointer"
              >
                <span>{copiedSection === "coverLetter" ? "✓ Copied" : "📋 Copy"}</span>
              </button>

              <button
                onClick={() =>
                  handleDownloadPdf(
                    job.coverLetterDraft!,
                    `Cover_Letter_${job.company.replace(/\s+/g, "_")}.pdf`
                  )
                }
                className="bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-slate-200 text-xs font-bold px-3.5 py-1.5 rounded-xl transition border border-gray-200 dark:border-zinc-700 flex items-center gap-1.5 cursor-pointer"
              >
                <span>📥 Download PDF</span>
              </button>
            </div>
          </div>

          <div className="whitespace-pre-wrap text-xs text-gray-800 dark:text-slate-300 bg-gray-50 dark:bg-[#0E0E12] p-4 sm:p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 font-mono leading-relaxed max-h-96 overflow-y-auto">
            {job.coverLetterDraft}
          </div>
        </section>
      )}
    </div>
  );
}
