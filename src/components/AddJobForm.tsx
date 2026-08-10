"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { addManualJobAction } from "@/actions/job.actions";

export function AddJobForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append("title", title);
    formData.append("company", company);
    formData.append("url", url);
    formData.append("description", description);

    const res = await addManualJobAction(formData);
    setIsSubmitting(false);

    if (!res.success) {
      setErrorMsg(res.error || "Failed to add manual job posting.");
    } else {
      router.push("/dashboard?source=manual");
      router.refresh();
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="space-y-2 pb-4 border-b border-slate-300 dark:border-zinc-800/80">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-md border border-indigo-500/20">
            Source: Manual Entry
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif text-gray-900 dark:text-slate-100 font-medium">
          Save Custom Job Posting
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 max-w-xl">
          Save any custom job link and full job description. Saved jobs can be scored with AI to generate fit analysis, cover letters, and tailored resumes.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200 text-xs font-semibold rounded-2xl flex justify-between items-center shadow-sm">
          <span>⚠️ {errorMsg}</span>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-rose-500 hover:text-rose-800 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="job-title-input" className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
              Job Title *
            </label>
            <input
              id="job-title-input"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Frontend Engineer"
              className="w-full bg-white dark:bg-[#121215] border border-slate-300 dark:border-zinc-800 text-gray-900 dark:text-slate-100 text-xs sm:text-sm font-medium rounded-2xl p-4 focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 transition shadow-xs"
            />
          </div>

          <div>
            <label htmlFor="company-name-input" className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
              Company Name *
            </label>
            <input
              id="company-name-input"
              type="text"
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Stripe, Acme Corp"
              className="w-full bg-white dark:bg-[#121215] border border-slate-300 dark:border-zinc-800 text-gray-900 dark:text-slate-100 text-xs sm:text-sm font-medium rounded-2xl p-4 focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 transition shadow-xs"
            />
          </div>
        </div>

        <div>
          <label htmlFor="job-url-input" className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
            Job Posting Link / URL *
          </label>
          <input
            id="job-url-input"
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://linkedin.com/jobs/view/... or https://company.com/careers/role"
            className="w-full bg-white dark:bg-[#121215] border border-slate-300 dark:border-zinc-800 text-gray-900 dark:text-slate-100 text-xs sm:text-sm font-medium rounded-2xl p-4 focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 transition shadow-xs"
          />
        </div>

        <div>
          <label htmlFor="job-description-input" className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
            Full Job Description *
          </label>
          <textarea
            id="job-description-input"
            rows={12}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Paste the full job description text or HTML content here..."
            className="w-full bg-white dark:bg-[#121215] border border-slate-300 dark:border-zinc-800 text-gray-900 dark:text-slate-100 text-xs sm:text-sm font-sans rounded-2xl p-4 focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 leading-relaxed transition shadow-xs"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm py-4 rounded-2xl transition disabled:opacity-50 shadow-md shadow-blue-500/20"
        >
          {isSubmitting ? "Saving Job Posting..." : "Save Job to Pipeline"}
        </button>
      </form>
    </div>
  );
}
