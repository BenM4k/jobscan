"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import type { JobSelect } from "@/dal/jobs.dal";
import type { InterviewQuestionItem } from "@/dal/interview.dal";
import { generateInterviewQuestionsAction } from "@/actions/interview.actions";

interface UseInterviewPrepProps {
  job: JobSelect;
  selectedResumeId?: string;
  initialQuestions?: InterviewQuestionItem[];
  onPipelineEntryResolved?: (pipelineEntryId: string) => void;
}

/** Manages interview-prep question generation, clipboard copy, and credit gating. */
export function useInterviewPrep({
  job,
  selectedResumeId,
  initialQuestions = [],
  onPipelineEntryResolved,
}: UseInterviewPrepProps) {
  const [questions, setQuestions] = useState<InterviewQuestionItem[]>(initialQuestions);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [insufficientOpen, setInsufficientOpen] = useState(false);
  const [insufficientData, setInsufficientData] = useState<{
    requiredCost?: number;
    currentBalance?: number;
  }>({});
  const idempotencyKeyRef = useRef<string | null>(null);

  const handleGenerate = async () => {
    const key =
      idempotencyKeyRef.current ?? (idempotencyKeyRef.current = crypto.randomUUID());
    setIsGenerating(true);

    try {
      const res = await generateInterviewQuestionsAction({
        jobId: job.canonicalJobId ?? job.id,
        pipelineEntryId: job.pipelineEntryId,
        idempotencyKey: key,
        resumeId: selectedResumeId,
      });

      if (!res.success || !res.data) {
        if (res.code === "insufficient_credits") {
          const details = res.details as
            | { requiredCost?: number; currentBalance?: number }
            | undefined;
          setInsufficientData({
            requiredCost: details?.requiredCost,
            currentBalance: details?.currentBalance,
          });
          setInsufficientOpen(true);
          return;
        }
        toast.error(res.error || "Failed to generate interview questions");
        return;
      }

      const payload = res.data as {
        questions?: InterviewQuestionItem[];
        pipelineEntryId?: string;
      };
      if (Array.isArray(payload.questions)) {
        setQuestions(payload.questions);
      }
      if (payload.pipelineEntryId) {
        onPipelineEntryResolved?.(payload.pipelineEntryId);
      }
      idempotencyKeyRef.current = crypto.randomUUID();
    } catch {
      toast.error("Failed to generate interview questions");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyAll = async () => {
    if (questions.length === 0) return;
    const formatted = questions
      .map(
        (q, idx) =>
          `${idx + 1}. [${q.category}] ${q.question}\nContext: ${q.context}\nTalking points:\n${q.suggestedTalkingPoints
            .map((p) => `- ${p}`)
            .join("\n")}`
      )
      .join("\n\n");
    await navigator.clipboard.writeText(formatted);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1800);
  };

  return {
    questions,
    isGenerating,
    isCopied,
    insufficientOpen,
    setInsufficientOpen,
    insufficientData,
    handleGenerate,
    handleCopyAll,
  };
}
