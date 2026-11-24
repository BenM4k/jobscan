"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { JobSelect } from "@/dal/jobs.dal";
import type { InterviewQuestionItem } from "@/dal/interview.dal";
import { generateInterviewQuestionsAction } from "@/actions/interview.actions";

interface UseInterviewPrepProps {
  job: JobSelect;
  selectedResumeId?: string;
  initialQuestions?: InterviewQuestionItem[];
  initialQuestionSetId?: string;
  initialQuestionsGeneratedAt?: string | Date | null;
  onPipelineEntryResolved?: (pipelineEntryId: string) => void;
}

/** Manages interview-prep question generation, clipboard copy, and credit gating. */
export function useInterviewPrep({
  job,
  selectedResumeId,
  initialQuestions = [],
  initialQuestionSetId,
  initialQuestionsGeneratedAt,
  onPipelineEntryResolved,
}: UseInterviewPrepProps) {
  const currentJobKey = job.canonicalJobId ?? job.id;
  const [questions, setQuestions] = useState<InterviewQuestionItem[]>(initialQuestions);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [insufficientOpen, setInsufficientOpen] = useState(false);
  const [insufficientData, setInsufficientData] = useState<{
    requiredCost?: number;
    currentBalance?: number;
  }>({});
  const idempotencyRef = useRef<{
    jobId: string;
    resumeId: string | undefined;
    key: string;
  } | null>(null);
  const localResultRef = useRef<{
    jobId: string;
    id?: string;
    generatedAtMs: number;
  } | null>(null);

  useEffect(() => {
    const local = localResultRef.current;
    if (local && local.jobId !== currentJobKey) {
      localResultRef.current = null;
      setQuestions(initialQuestions);
      return;
    }

    if (!local) {
      setQuestions(initialQuestions);
      return;
    }

    const matchesLocalId = Boolean(
      initialQuestionSetId && local.id && initialQuestionSetId === local.id
    );
    const incomingMs = initialQuestionsGeneratedAt
      ? new Date(initialQuestionsGeneratedAt).getTime()
      : NaN;
    const isNewerServerSnapshot =
      Number.isFinite(incomingMs) && incomingMs > local.generatedAtMs;

    if (matchesLocalId || isNewerServerSnapshot) {
      localResultRef.current = null;
      setQuestions(initialQuestions);
    }
  }, [
    currentJobKey,
    initialQuestions,
    initialQuestionSetId,
    initialQuestionsGeneratedAt,
  ]);

  const handleGenerate = async () => {
    if (
      !idempotencyRef.current ||
      idempotencyRef.current.jobId !== currentJobKey ||
      idempotencyRef.current.resumeId !== selectedResumeId
    ) {
      idempotencyRef.current = {
        jobId: currentJobKey,
        resumeId: selectedResumeId,
        key: crypto.randomUUID(),
      };
    }
    const key = idempotencyRef.current.key;
    setIsGenerating(true);

    try {
      const res = await generateInterviewQuestionsAction({
        jobId: currentJobKey,
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
        id?: string;
        createdAt?: string | Date;
        questions?: InterviewQuestionItem[];
        pipelineEntryId?: string;
      };
      if (Array.isArray(payload.questions)) {
        const generatedAtMs = payload.createdAt
          ? new Date(payload.createdAt).getTime()
          : Date.now();
        localResultRef.current = {
          jobId: currentJobKey,
          id: payload.id,
          generatedAtMs: Number.isFinite(generatedAtMs) ? generatedAtMs : Date.now(),
        };
        setQuestions(payload.questions);
      }
      if (payload.pipelineEntryId) {
        onPipelineEntryResolved?.(payload.pipelineEntryId);
      }
      idempotencyRef.current = null;
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
