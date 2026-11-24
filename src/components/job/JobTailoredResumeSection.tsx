"use client";

import React, { useState } from "react";
import type { JobSelect } from "@/dal/jobs.dal";
import type { MasterResumeSelect } from "@/services/db/schema";
import {
  FileText,
  RotateCcw,
  Copy,
  Download,
  Edit3,
  Check,
  History,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useTailoredResume } from "./useTailoredResume";
import { TailoredResumeActions } from "./TailoredResumeActions";
import { TailoredResumePreview } from "./TailoredResumePreview";
import { TailoredResumeEditor } from "./TailoredResumeEditor";
import { DocumentVersionHistoryDialog } from "./DocumentVersionHistoryDialog";
import { ConfirmRegenerateDialog } from "./ConfirmRegenerateDialog";
import { RetryProgressBadge } from "@/components/ui/RetryProgressBadge";
import { InsufficientCreditsDialog } from "@/components/billing/InsufficientCreditsDialog";

interface JobTailoredResumeSectionProps {
  job: JobSelect;
  onJobUpdated: (updated: JobSelect) => void;
  selectedResumeId?: string;
  onResumePromoted?: (newPersona: MasterResumeSelect) => void;
}

/** Provides tailored-resume generation, Structured/Markdown editing, saving, and PDF export. */
export function JobTailoredResumeSection({
  job,
  onJobUpdated,
  selectedResumeId,
  onResumePromoted,
}: JobTailoredResumeSectionProps) {
  const t = useTranslations("jobDetail");
  const tCommon = useTranslations("common");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [confirmRegenOpen, setConfirmRegenOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const {
    isGenerating,
    retryStatus,
    retryAttempt,
    totalAttempts,
    retryCountdown,
    retryMessage,
    cancelRetry,
    retryNow,
    isSaving,
    isEditing,
    isDirty,
    handleStartEditing,
    handleCancelEdit,
    handleRestoreVersion,
    editedResume,
    setEditedResume,
    isCopied,
    hasResume,
    handleGenerate,
    handleSave,
    handleDownloadPdf,
    handleCopy,
    isInsufficientCreditsOpen,
    setIsInsufficientCreditsOpen,
    insufficientCreditsData,
  } = useTailoredResume({ job, onJobUpdated, selectedResumeId });

  const displayContent = editedResume || job.tailoredResume || "";
  const docLanguage = job.language === "fr" ? "fr" : "en";

  const onStartEditing = () => {
    setHasInteracted(true);
    handleStartEditing();
  };

  const onGenerateClick = () => {
    setHasInteracted(true);
    void handleGenerate();
  };

  return (
    <section aria-label={t("tailoredResumeHeading")} className="py-4 space-y-3">
      {/* Header Row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <FileText className="size-4.5 text-muted-foreground dark:text-zinc-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h2 className="text-sm font-medium text-foreground dark:text-zinc-100 font-sans">
              {t("tailoredResumeHeading")}
            </h2>
            <p className="text-sm text-gray-500 dark:text-zinc-400 font-normal leading-normal font-sans">
              {t("tailoredResumeSubtitle")}
            </p>
          </div>
        </div>

        {!hasResume && !isGenerating && (
          <div className="shrink-0 pt-0.5">
            <button
              type="button"
              onClick={onGenerateClick}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors p-0 bg-transparent border-0 cursor-pointer font-sans inline-flex items-center gap-1.5"
            >
              <span>{t("generateResume")}</span>
              <span className="text-xs text-muted-foreground font-normal">
                ({t("cost5Credits")})
              </span>
            </button>
          </div>
        )}
      </div>

      <RetryProgressBadge
        status={retryStatus}
        attempt={retryAttempt}
        totalAttempts={totalAttempts}
        countdown={retryCountdown}
        message={retryMessage}
        onRetryNow={retryNow}
        onCancel={cancelRetry}
      />

      {isGenerating && retryStatus !== "retrying" && (
        <div className="ml-7.5 border-l-2 border-border dark:border-zinc-800 pl-3.5 py-1 space-y-2 jp-fade-in">
          <div className="h-3.5 w-full bg-muted dark:bg-zinc-800 animate-pulse rounded-sm" />
          <div className="h-3.5 w-5/6 bg-muted dark:bg-zinc-800 animate-pulse rounded-sm" />
          <div className="h-3.5 w-3/4 bg-muted dark:bg-zinc-800 animate-pulse rounded-sm" />
        </div>
      )}

      {hasResume && !isGenerating && (
        <div className="space-y-3">
          {isEditing ? (
            <div className="ml-7.5 jp-reveal">
              <TailoredResumeEditor
                value={editedResume}
                onChange={setEditedResume}
                language={docLanguage}
                isDirty={isDirty}
                isSaving={isSaving}
                matchedSkills={job.matchedSkills}
                missingSkills={job.missingSkills}
                onSave={handleSave}
                onCancel={handleCancelEdit}
              />
            </div>
          ) : (
            <div
              className={`ml-7.5 border-l-2 border-border dark:border-zinc-800 pl-3.5 ${
                hasInteracted ? "jp-fade-in" : ""
              }`}
            >
              <TailoredResumePreview content={displayContent} />
            </div>
          )}

          {/* Secondary Action Row */}
          <div className="ml-7.5 flex flex-wrap items-center gap-x-4 gap-y-2.5 sm:gap-4">
            <button
              type="button"
              onClick={handleCopy}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1.5 p-0 bg-transparent border-0 cursor-pointer font-sans"
            >
              {isCopied ? (
                <Check className="size-3.5 shrink-0" />
              ) : (
                <Copy className="size-3.5 shrink-0" />
              )}
              <span>{isCopied ? tCommon("copied") : t("copyText")}</span>
            </button>

            <button
              type="button"
              onClick={() => handleDownloadPdf(displayContent)}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1.5 p-0 bg-transparent border-0 cursor-pointer font-sans"
            >
              <Download className="size-3.5 shrink-0" />
              <span>{tCommon("downloadPdf")}</span>
            </button>

            {!isEditing && (
              <button
                type="button"
                onClick={onStartEditing}
                disabled={isGenerating}
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1.5 p-0 bg-transparent border-0 cursor-pointer disabled:opacity-50 font-sans"
              >
                <Edit3 className="size-3.5 shrink-0" />
                <span>{t("editResume")}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setConfirmRegenOpen(true)}
              disabled={isGenerating}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1.5 p-0 bg-transparent border-0 cursor-pointer disabled:opacity-50 font-sans"
            >
              <RotateCcw className="size-3.5 shrink-0" />
              <span>{t("regenerateResume")}</span>
            </button>

            {job.pipelineEntryId && (
              <button
                type="button"
                onClick={() => setHistoryOpen(true)}
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1.5 p-0 bg-transparent border-0 cursor-pointer font-sans"
              >
                <History className="size-3.5 shrink-0" />
                <span>{t("versionHistory")}</span>
              </button>
            )}
          </div>

          {job.pipelineEntryId && (
            <DocumentVersionHistoryDialog
              open={historyOpen}
              onOpenChange={setHistoryOpen}
              pipelineEntryId={job.pipelineEntryId}
              type="resume"
              onRestore={(restored) => {
                setHasInteracted(true);
                return handleRestoreVersion(restored);
              }}
            />
          )}

          <div className="ml-7.5">
            <TailoredResumeActions
              tailoredResumeRecordId={job.tailoredResumeRecordId}
              defaultLabel={`${job.company} — ${job.title}`}
              onPromoted={onResumePromoted}
            />
          </div>
        </div>
      )}

      <ConfirmRegenerateDialog
        open={confirmRegenOpen}
        onOpenChange={setConfirmRegenOpen}
        title={t("confirmRegenResumeTitle")}
        description={t("confirmRegenResumeDesc")}
        confirmLabel={t("regenerateResume")}
        costLabel={t("cost5Credits")}
        onConfirm={onGenerateClick}
      />

      <InsufficientCreditsDialog
        open={isInsufficientCreditsOpen}
        onOpenChange={setIsInsufficientCreditsOpen}
        requiredCost={insufficientCreditsData.requiredCost}
        currentBalance={insufficientCreditsData.currentBalance}
      />
    </section>
  );
}
