import React from "react";
import { MasterResumeSelect } from "@/services/db/schema";
import { Check, FileText, Globe, Sparkles, History } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ResumeCardActions } from "./ResumeCardActions";

interface ResumeCardProps {
  resume: MasterResumeSelect;
  isOnlyResume: boolean;
}

export async function ResumeCard({ resume, isOnlyResume }: ResumeCardProps) {
  const t = await getTranslations("resumes");

  const isUploaded = resume.source === "uploaded";
  const updatedDate = resume.updatedAt
    ? new Date(resume.updatedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div
      className={`rounded-xl border transition-all p-5 bg-card text-card-foreground flex flex-col justify-between h-full gap-4 ${
        resume.isActive
          ? "border-blue-500/50 shadow-xs ring-1 ring-blue-500/20 dark:border-blue-500/40"
          : "border-border/60 hover:border-border"
      }`}
    >
      {/* Top Header: Label, Badges & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 font-sans">
              <FileText className="size-4 text-muted-foreground shrink-0" />
              <span>{resume.label}</span>
            </h3>

            {resume.isActive && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full font-sans">
                <Check className="size-3" />
                <span>{t("activePersona")}</span>
              </span>
            )}

            <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
              <Globe className="size-3" />
              <span>{resume.language}</span>
            </span>

            <span className="inline-flex items-center gap-1 text-[11px] font-normal text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full font-mono">
              <History className="size-3" />
              <span>v{resume.version}</span>
            </span>

            <span
              className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full font-sans ${
                isUploaded
                  ? "bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300"
                  : "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
              }`}
            >
              {!isUploaded && <Sparkles className="size-3 shrink-0" />}
              <span>{isUploaded ? t("uploaded") : t("promotedFromTailored")}</span>
            </span>
          </div>

          {updatedDate && (
            <p className="text-xs text-muted-foreground">
              {t("lastUpdated", { date: updatedDate })}
            </p>
          )}
        </div>

        {/* Action Buttons (Client Leaf) */}
        <ResumeCardActions resume={resume} isOnlyResume={isOnlyResume} />
      </div>

      {/* Content Preview Snippet (Non-interactive display) */}
      <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground font-mono leading-relaxed line-clamp-3 border border-border/40 select-text flex-1">
        {resume.content}
      </div>
    </div>
  );
}
