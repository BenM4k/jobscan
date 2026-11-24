"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const formPrimaryButtonClass =
  "inline-flex items-center justify-center font-medium text-xs sm:text-sm px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition shadow-xs disabled:opacity-50 cursor-pointer";

const lineInputClass =
  "w-full bg-transparent border-0 border-b border-slate-300 dark:border-zinc-800 text-gray-900 dark:text-slate-100 text-base sm:text-sm font-sans rounded-none px-0 py-2 sm:py-2.5 placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-b-2 focus:border-blue-600 dark:focus:border-blue-500 focus:ring-0 transition-colors";

const lineSelectClass =
  "w-full bg-transparent border-0 border-b border-slate-300 dark:border-zinc-800 text-gray-900 dark:text-slate-100 text-base sm:text-sm font-sans rounded-none px-0 py-2 sm:py-2.5 focus:outline-none focus:border-b-2 focus:border-blue-600 dark:focus:border-blue-500 focus:ring-0 transition-colors cursor-pointer";

const lineTextareaClass =
  "w-full bg-transparent border-0 border-b border-slate-300 dark:border-zinc-800 text-gray-900 dark:text-slate-100 text-base sm:text-sm font-sans rounded-none px-0 py-2 sm:py-2.5 leading-relaxed placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-b-2 focus:border-blue-600 dark:focus:border-blue-500 focus:ring-0 transition-colors resize-y";

export interface AddJobFormValues {
  title: string;
  company: string;
  location: string;
  workplaceType: string;
  url: string;
  salary: string;
  language: "en" | "fr";
  description: string;
}

interface AddJobFormFieldsProps {
  values: AddJobFormValues;
  isSubmitting: boolean;
  onChange: <K extends keyof AddJobFormValues>(
    field: K,
    value: AddJobFormValues[K]
  ) => void;
  onSubmit: (e: React.FormEvent) => void;
}

/** Presentational form fields for manual job creation and review of imported jobs. */
export function AddJobFormFields({
  values,
  isSubmitting,
  onChange,
  onSubmit,
}: AddJobFormFieldsProps) {
  const t = useTranslations("addJob");

  return (
    <div className="border-t border-slate-200/80 dark:border-zinc-800/80 pt-6">
      <form onSubmit={onSubmit} className="space-y-7">
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
              value={values.title}
              onChange={(e) => onChange("title", e.target.value)}
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
              value={values.company}
              onChange={(e) => onChange("company", e.target.value)}
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
              value={values.location}
              onChange={(e) => onChange("location", e.target.value)}
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
              value={values.workplaceType}
              onChange={(e) => onChange("workplaceType", e.target.value)}
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
              value={values.url}
              onChange={(e) => onChange("url", e.target.value)}
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
              value={values.salary}
              onChange={(e) => onChange("salary", e.target.value)}
              placeholder={t("salaryPlaceholder")}
              className={lineInputClass}
            />
          </div>
        </div>

        {/* Row 4: Language Selection */}
        <div>
          <span
            id="job-language-label"
            className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-2 font-sans"
          >
            Job Language / Langue de l&apos;offre
          </span>
          <div
            role="group"
            aria-labelledby="job-language-label"
            className="inline-flex rounded-lg border border-slate-300 dark:border-zinc-800 p-0.5 bg-slate-100 dark:bg-zinc-900 text-xs"
          >
            <button
              type="button"
              aria-pressed={values.language === "en"}
              onClick={() => onChange("language", "en")}
              className={cn(
                "px-3.5 py-1.5 rounded-md font-medium transition cursor-pointer flex items-center gap-1.5",
                values.language === "en"
                  ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-xs font-semibold"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <span>🇺🇸</span>
              <span>English</span>
            </button>
            <button
              type="button"
              aria-pressed={values.language === "fr"}
              onClick={() => onChange("language", "fr")}
              className={cn(
                "px-3.5 py-1.5 rounded-md font-medium transition cursor-pointer flex items-center gap-1.5",
                values.language === "fr"
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
            rows={6}
            required
            value={values.description}
            onChange={(e) => onChange("description", e.target.value)}
            placeholder={t("descriptionPlaceholder")}
            className={lineTextareaClass}
          />
        </div>

        <div className="pt-8 flex items-center justify-end">
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
  );
}
