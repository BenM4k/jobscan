"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { addManualJobAction } from "@/actions/job.actions";
import { AddJobHeader } from "@/components/AddJobHeader";
import { cn } from "@/lib/utils";
import posthog from "posthog-js";

/**
 * Standard button styles for form actions:
 * - formPrimaryButtonClass: primary solid action (matches "Fetch Jobs" & "Apply")
 * - formSecondaryButtonClass: secondary outline action (no fill, sized to match primary)
 * - formGhostButtonClass: ghost/text-only action (no fill, no border)
 */
export const formPrimaryButtonClass =
  "inline-flex items-center justify-center font-medium text-xs sm:text-sm px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition shadow-xs disabled:opacity-50 cursor-pointer";

export const formSecondaryButtonClass =
  "inline-flex items-center justify-center font-medium text-xs sm:text-sm px-6 py-2.5 rounded-lg border border-slate-300 dark:border-zinc-800 bg-transparent hover:bg-slate-100 dark:hover:bg-zinc-800/60 text-slate-700 dark:text-zinc-300 transition disabled:opacity-50 cursor-pointer";

export const formGhostButtonClass =
  "inline-flex items-center justify-center font-medium text-xs sm:text-sm px-6 py-2.5 rounded-lg bg-transparent hover:bg-slate-100 dark:hover:bg-zinc-800/50 text-slate-600 dark:text-zinc-400 hover:text-foreground transition disabled:opacity-50 cursor-pointer";

const lineInputClass =
  "w-full bg-transparent border-0 border-b border-slate-300 dark:border-zinc-800 text-gray-900 dark:text-slate-100 text-base sm:text-sm font-sans rounded-none px-0 py-2 sm:py-2.5 placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-b-2 focus:border-blue-600 dark:focus:border-blue-500 focus:ring-0 transition-colors";

const lineSelectClass =
  "w-full bg-transparent border-0 border-b border-slate-300 dark:border-zinc-800 text-gray-900 dark:text-slate-100 text-base sm:text-sm font-sans rounded-none px-0 py-2 sm:py-2.5 focus:outline-none focus:border-b-2 focus:border-blue-600 dark:focus:border-blue-500 focus:ring-0 transition-colors cursor-pointer";

const lineTextareaClass =
  "w-full bg-transparent border-0 border-b border-slate-300 dark:border-zinc-800 text-gray-900 dark:text-slate-100 text-base sm:text-sm font-sans rounded-none px-0 py-2 sm:py-2.5 leading-relaxed placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-b-2 focus:border-blue-600 dark:focus:border-blue-500 focus:ring-0 transition-colors resize-y";

export function AddJobForm() {
  const router = useRouter();
  const t = useTranslations("addJob");

  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [workplaceType, setWorkplaceType] = useState("");
  const [url, setUrl] = useState("");
  const [salary, setSalary] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState<"en" | "fr">("en");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append("title", title);
    formData.append("company", company);
    formData.append("location", location);
    formData.append("workplaceType", workplaceType);
    formData.append("url", url);
    formData.append("salary", salary);
    formData.append("language", language);
    formData.append("description", description);

    const res = await addManualJobAction(formData);
    setIsSubmitting(false);

    if (!res.success) {
      setErrorMsg(res.error || "Failed to add manual job posting.");
    } else {
      posthog.capture("job_created", { source: "manual" });
      router.push("/dashboard?source=manual");
      router.refresh();
    }
  };

  return (
    <div className="space-y-6 w-full font-sans">
      <AddJobHeader />

      {errorMsg && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200 text-xs font-semibold rounded-lg flex justify-between items-center shadow-xs">
          <span>⚠️ {errorMsg}</span>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-rose-500 hover:text-rose-800 text-xs font-bold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Clear content boundary above the first field */}
      <div className="border-t border-slate-200/80 dark:border-zinc-800/80 pt-6">
        <form onSubmit={handleSubmit} className="space-y-7">
          {/* Row 1: Title & Company */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div>
              <label
                htmlFor="job-title-input"
                className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1 font-sans"
              >
                {t("jobTitleLabel")} *
              </label>
              <input
                id="job-title-input"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("jobTitlePlaceholder")}
                className={lineInputClass}
              />
            </div>

            <div>
              <label
                htmlFor="company-name-input"
                className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1 font-sans"
              >
                {t("companyLabel")} *
              </label>
              <input
                id="company-name-input"
                type="text"
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder={t("companyPlaceholder")}
                className={lineInputClass}
              />
            </div>
          </div>

          {/* Row 2: Location & Workplace Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div>
              <label
                htmlFor="job-location-input"
                className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1 font-sans"
              >
                {t("locationLabel")}
              </label>
              <input
                id="job-location-input"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t("locationPlaceholder")}
                className={lineInputClass}
              />
            </div>

            <div>
              <label
                htmlFor="job-workplace-input"
                className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1 font-sans"
              >
                {t("workplaceTypeLabel")}
              </label>
              <select
                id="job-workplace-input"
                value={workplaceType}
                onChange={(e) => setWorkplaceType(e.target.value)}
                className={lineSelectClass}
              >
                <option value="">—</option>
                <option value="remote">{t("workplaceRemote")}</option>
                <option value="hybrid">{t("workplaceHybrid")}</option>
                <option value="on-site">{t("workplaceOnSite")}</option>
              </select>
            </div>
          </div>

          {/* Row 3: URL & Salary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div>
              <label
                htmlFor="job-url-input"
                className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1 font-sans"
              >
                {t("urlLabel")}
              </label>
              <input
                id="job-url-input"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={t("urlPlaceholder")}
                className={lineInputClass}
              />
            </div>

            <div>
              <label
                htmlFor="job-salary-input"
                className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1 font-sans"
              >
                {t("salaryLabel")}
              </label>
              <input
                id="job-salary-input"
                type="text"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder={t("salaryPlaceholder")}
                className={lineInputClass}
              />
            </div>
          </div>

          {/* Row 4: Language Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-2 font-sans">
              Job Language / Langue de l&apos;offre
            </label>
            <div className="inline-flex rounded-lg border border-slate-300 dark:border-zinc-800 p-0.5 bg-slate-100 dark:bg-zinc-900 text-xs">
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={cn(
                  "px-3.5 py-1.5 rounded-md font-medium transition cursor-pointer flex items-center gap-1.5",
                  language === "en"
                    ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-xs font-semibold"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <span>🇺🇸</span>
                <span>English</span>
              </button>
              <button
                type="button"
                onClick={() => setLanguage("fr")}
                className={cn(
                  "px-3.5 py-1.5 rounded-md font-medium transition cursor-pointer flex items-center gap-1.5",
                  language === "fr"
                    ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-xs font-semibold"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <span>🇫🇷</span>
                <span>Français</span>
              </button>
            </div>
          </div>

          {/* Row 5: Description */}
          <div>
            <label
              htmlFor="job-description-input"
              className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1 font-sans"
            >
              {t("descriptionLabel")} *
            </label>
            <textarea
              id="job-description-input"
              rows={1}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
              className={lineTextareaClass}
            />
          </div>

          <div className="pt-24 flex items-center justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn("w-full sm:w-auto", formPrimaryButtonClass)}
            >
              {isSubmitting ? t("submitting") : t("submitButton")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
