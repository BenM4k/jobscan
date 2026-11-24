"use client";

import React from "react";
import { MessageSquare, RotateCcw, Copy, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import type { JobSelect } from "@/dal/jobs.dal";
import type { InterviewQuestionItem } from "@/dal/interview.dal";
import { useInterviewPrep } from "./useInterviewPrep";
import { InsufficientCreditsDialog } from "@/components/billing/InsufficientCreditsDialog";

interface JobInterviewPrepSectionProps {
  job: JobSelect;
  selectedResumeId?: string;
  initialQuestions?: InterviewQuestionItem[];
  initialQuestionSetId?: string;
  initialQuestionsGeneratedAt?: string;
  onPipelineEntryResolved?: (pipelineEntryId: string) => void;
}

function getCategoryLabelKey(category: string) {
  switch (category) {
    case "behavioral":
      return "interviewCategoryBehavioral";
    case "technical":
      return "interviewCategoryTechnical";
    case "situational":
      return "interviewCategorySituational";
    default:
      return "interviewCategoryRoleSpecific";
  }
}

/** Displays and generates resume-backed interview questions and talking points for a job. */
export function JobInterviewPrepSection({
  job,
  selectedResumeId,
  initialQuestions = [],
  initialQuestionSetId,
  initialQuestionsGeneratedAt,
  onPipelineEntryResolved,
}: JobInterviewPrepSectionProps) {
  const t = useTranslations("jobDetail");
  const tCommon = useTranslations("common");
  const {
    questions,
    isGenerating,
    isCopied,
    insufficientOpen,
    setInsufficientOpen,
    insufficientData,
    handleGenerate,
    handleCopyAll,
  } = useInterviewPrep({
    job,
    selectedResumeId,
    initialQuestions,
    initialQuestionSetId,
    initialQuestionsGeneratedAt,
    onPipelineEntryResolved,
  });

  return (
    <section
      aria-label={t("interviewPrepHeading")}
      className="py-4 border-b border-border/40 space-y-3"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <MessageSquare className="size-4.5 text-muted-foreground dark:text-zinc-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h2 className="text-sm font-medium text-foreground dark:text-zinc-100 font-sans">
              {t("interviewPrepHeading")}
            </h2>
            <p className="text-sm text-gray-500 dark:text-zinc-400 font-normal leading-normal font-sans">
              {t("interviewPrepSubtitle")}
            </p>
          </div>
        </div>

        {questions.length === 0 && !isGenerating && (
          <div className="shrink-0 pt-0.5">
            <button
              type="button"
              onClick={handleGenerate}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors p-0 bg-transparent border-0 cursor-pointer font-sans"
            >
              {t("generateInterviewPrep")}
            </button>
          </div>
        )}
      </div>

      {isGenerating && (
        <div className="ml-7.5 border-l-2 border-border dark:border-zinc-800 pl-3.5 py-1 space-y-2">
          <p className="text-xs text-muted-foreground">{t("regeneratingInterviewPrep")}</p>
          <div className="h-3.5 w-full bg-muted dark:bg-zinc-800 animate-pulse rounded-sm" />
          <div className="h-3.5 w-5/6 bg-muted dark:bg-zinc-800 animate-pulse rounded-sm" />
        </div>
      )}

      {questions.length === 0 && !isGenerating && (
        <p className="ml-7.5 text-xs text-muted-foreground font-sans">
          {t("interviewPrepEmpty")}
        </p>
      )}

      {questions.length > 0 && !isGenerating && (
        <div className="space-y-3">
          <div className="ml-7.5 border-l-2 border-border dark:border-zinc-800 pl-3.5 space-y-4">
            {questions.map((item, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                    {t(getCategoryLabelKey(item.category))}
                  </span>
                  <h3 className="text-sm font-medium text-foreground dark:text-zinc-100">
                    {idx + 1}. {item.question}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.context}</p>
                {item.suggestedTalkingPoints.length > 0 && (
                  <div className="space-y-1 pt-0.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("talkingPoints")}
                    </div>
                    <ul className="list-disc pl-4 space-y-1 text-xs text-gray-600 dark:text-zinc-300">
                      {item.suggestedTalkingPoints.map((pt, pIdx) => (
                        <li key={pIdx}>{pt}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="ml-7.5 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={handleCopyAll}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1.5 p-0 bg-transparent border-0 cursor-pointer font-sans"
            >
              {isCopied ? <Check className="size-3.5 shrink-0" /> : <Copy className="size-3.5 shrink-0" />}
              <span>{isCopied ? tCommon("copied") : t("copyQuestions")}</span>
            </button>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1.5 p-0 bg-transparent border-0 cursor-pointer disabled:opacity-50 font-sans"
            >
              <RotateCcw className="size-3.5 shrink-0" />
              <span>{t("regenerateInterviewPrep")}</span>
            </button>
          </div>
        </div>
      )}

      <InsufficientCreditsDialog
        open={insufficientOpen}
        onOpenChange={setInsufficientOpen}
        requiredCost={insufficientData.requiredCost}
        currentBalance={insufficientData.currentBalance}
      />
    </section>
  );
}
