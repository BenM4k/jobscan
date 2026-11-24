"use client";

import React, { useState } from "react";
import type { JobSelect } from "@/dal/jobs.dal";
import {
  Mail,
  RotateCcw,
  Copy,
  Download,
  Edit3,
  Check,
  History,
  SlidersHorizontal,
  Square,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCoverLetter } from "./useCoverLetter";
import { CoverLetterEditor } from "./CoverLetterEditor";
import { CoverLetterOptionsBar } from "./CoverLetterOptionsBar";
import { DocumentVersionHistoryDialog } from "./DocumentVersionHistoryDialog";
import { ConfirmRegenerateDialog } from "./ConfirmRegenerateDialog";
import { RetryProgressBadge } from "@/components/ui/RetryProgressBadge";
import { InsufficientCreditsDialog } from "@/components/billing/InsufficientCreditsDialog";

interface JobCoverLetterSectionProps {
  job: JobSelect;
  onJobUpdated: (updated: JobSelect) => void;
  selectedResumeId?: string;
}

/** Provides cover-letter streaming, tone/instructions customization, editing, and PDF export. */
export function JobCoverLetterSection({
  job,
  onJobUpdated,
  selectedResumeId,
}: JobCoverLetterSectionProps) {
  const t = useTranslations("jobDetail");
  const tCommon = useTranslations("common");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [confirmRegenOpen, setConfirmRegenOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const {
    isStreaming,
    retryStatus,
    retryAttempt,
    totalAttempts,
    retryCountdown,
    retryMessage,
    cancelRetry,
    retryNow,
    coverLetter,
    setCoverLetter,
    isSaving,
    isEditing,
    isDirty,
    handleStartEditing,
    handleCancelEdit,
    handleRestoreVersion,
    isCopied,
    hasCoverLetter,
    handleGenerateStream,
    handleRegenerate,
    handleSave,
    handleDownloadPdf,
    handleCopy,
    isInsufficientCreditsOpen,
    setIsInsufficientCreditsOpen,
    insufficientCreditsData,
  } = useCoverLetter({ job, onJobUpdated, selectedResumeId });

  const hasContent = hasCoverLetter || Boolean(coverLetter);
  const isIdle = !hasContent && !isStreaming;
  const isLoading = isStreaming && !coverLetter;
  const isGeneratedOrStreaming =
    hasContent || (isStreaming && Boolean(coverLetter));

  const onStartEditing = () => {
    setHasInteracted(true);
    handleStartEditing();
  };

  const onGenerateClick = () => {
    setHasInteracted(true);
    void handleGenerateStream();
  };

  return (
    <section aria-label={t("coverLetterHeading")} className="py-4 space-y-3">
      <div>
        {/* Header Row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Mail className="size-4.5 text-muted-foreground dark:text-zinc-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h2 className="text-sm font-medium text-foreground dark:text-zinc-100 font-sans">
                {t("coverLetterHeading")}
              </h2>
              <p className="text-sm text-gray-500 dark:text-zinc-400 font-normal leading-normal font-sans">
                {t("coverLetterSubtitle")}
              </p>
            </div>
          </div>

          {isIdle && (
            <div className="shrink-0 pt-0.5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setOptionsOpen((prev) => !prev)}
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 p-0 bg-transparent border-0 cursor-pointer font-sans"
              >
                <SlidersHorizontal className="size-3.5" />
                <span>{t("customizeTone")}</span>
              </button>
              <button
                type="button"
                onClick={onGenerateClick}
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors p-0 bg-transparent border-0 cursor-pointer font-sans inline-flex items-center gap-1.5"
              >
                <span>{t("generateCoverLetter")}</span>
                <span className="text-xs text-muted-foreground font-normal">
                  ({t("cost5Credits")})
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Smoothly collapsible tone & instructions bar */}
        <div
          className="ml-7.5 jp-collapse"
          data-open={optionsOpen ? "true" : "false"}
          aria-hidden={!optionsOpen}
          inert={!optionsOpen || undefined}
        >
          <div>
            <div className="pt-3">
              <CoverLetterOptionsBar
                hasExistingDraft={hasContent}
                isStreaming={isStreaming}
                onCancel={() => setOptionsOpen(false)}
                onGenerate={(opts) => {
                  setOptionsOpen(false);
                  setHasInteracted(true);
                  if (hasContent) {
                    void handleRegenerate(opts);
                  } else {
                    void handleGenerateStream(opts);
                  }
                }}
              />
            </div>
          </div>
        </div>
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

      {isLoading && retryStatus !== "retrying" && (
        <div className="ml-7.5 border-l-2 border-border dark:border-zinc-800 pl-3.5 py-1 space-y-2 jp-fade-in">
          <div className="h-3.5 w-full bg-muted dark:bg-zinc-800 animate-pulse rounded-sm" />
          <div className="h-3.5 w-5/6 bg-muted dark:bg-zinc-800 animate-pulse rounded-sm" />
          <div className="h-3.5 w-3/4 bg-muted dark:bg-zinc-800 animate-pulse rounded-sm" />
        </div>
      )}

      {isGeneratedOrStreaming && (
        <div className="space-y-3">
          {isEditing ? (
            <div className="ml-7.5 jp-reveal">
              <CoverLetterEditor
                value={coverLetter}
                onChange={setCoverLetter}
                isDirty={isDirty}
                isSaving={isSaving}
                isStreaming={isStreaming}
                matchedSkills={job.matchedSkills}
                missingSkills={job.missingSkills}
                onSave={handleSave}
                onCancel={handleCancelEdit}
              />
            </div>
          ) : (
            <div
              className={`ml-7.5 border-l-2 border-border dark:border-zinc-800 pl-3.5 text-sm leading-relaxed text-gray-600 dark:text-zinc-300 font-sans ${
                hasInteracted ? "jp-fade-in" : ""
              }`}
            >
              <p className="whitespace-pre-line leading-relaxed font-sans">
                {coverLetter}
              </p>
            </div>
          )}

          {/* Action Row */}
          <div className="ml-7.5 flex flex-wrap items-center gap-x-4 gap-y-2.5 sm:gap-4">
            {isStreaming && (
              <button
                type="button"
                onClick={cancelRetry}
                className="text-sm font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 transition-colors inline-flex items-center gap-1.5 p-0 bg-transparent border-0 cursor-pointer font-sans"
              >
                <Square className="size-3.5 shrink-0" />
                <span>{t("stopStreaming")}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopy}
              disabled={isStreaming}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1.5 p-0 bg-transparent border-0 cursor-pointer disabled:opacity-50 font-sans"
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
              onClick={handleDownloadPdf}
              disabled={isStreaming}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1.5 p-0 bg-transparent border-0 cursor-pointer disabled:opacity-50 font-sans"
            >
              <Download className="size-3.5 shrink-0" />
              <span>{tCommon("downloadPdf")}</span>
            </button>

            {!isEditing && (
              <button
                type="button"
                onClick={onStartEditing}
                disabled={isStreaming}
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1.5 p-0 bg-transparent border-0 cursor-pointer disabled:opacity-50 font-sans"
              >
                <Edit3 className="size-3.5 shrink-0" />
                <span>{t("editDraft")}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setOptionsOpen((prev) => !prev)}
              disabled={isStreaming}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1.5 p-0 bg-transparent border-0 cursor-pointer disabled:opacity-50 font-sans"
            >
              <SlidersHorizontal className="size-3.5 shrink-0" />
              <span>{t("customizeTone")}</span>
            </button>

            <button
              type="button"
              onClick={() => setConfirmRegenOpen(true)}
              disabled={isStreaming}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1.5 p-0 bg-transparent border-0 cursor-pointer disabled:opacity-50 font-sans"
            >
              <RotateCcw className="size-3.5 shrink-0" />
              <span>{t("regenerateLetter")}</span>
            </button>

            {job.pipelineEntryId && hasContent && !isStreaming && (
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
              type="cover_letter"
              onRestore={(restored) => {
                setHasInteracted(true);
                return handleRestoreVersion(restored);
              }}
            />
          )}
        </div>
      )}

      <ConfirmRegenerateDialog
        open={confirmRegenOpen}
        onOpenChange={setConfirmRegenOpen}
        title={t("confirmRegenLetterTitle")}
        description={t("confirmRegenLetterDesc")}
        confirmLabel={t("regenerateLetter")}
        costLabel={t("cost5Credits")}
        onConfirm={() => {
          setHasInteracted(true);
          void handleRegenerate();
        }}
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
