"use client";

import { FileText } from "lucide-react";
import { useTranslations } from "next-intl";

/** Renders the static-shell-safe localized header for the resumes page. */
export function ResumesPageHeader() {
  const t = useTranslations("resumes");

  return (
    <div className="space-y-1.5 border-b border-border/80 pb-6">
      <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border text-xs font-medium font-sans">
        <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        <span>{t("headerBadge")}</span>
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
        {t("title")}
      </h1>
      <p className="text-sm text-muted-foreground max-w-2xl">
        {t("subtitle")}
      </p>
    </div>
  );
}
