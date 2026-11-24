import "server-only";

import { generateText, Output } from "ai";
import { getActiveLanguageModel } from "@/services/ai/provider-config";
import { z } from "zod";
import * as jobsDal from "@/dal/jobs.dal";
import * as pipelineDal from "@/dal/pipeline.dal";
import * as resumeDal from "@/dal/resume.dal";
import * as interviewDal from "@/dal/interview.dal";
import type { InterviewQuestionItem } from "@/dal/interview.dal";
import { withAiTracking } from "@/services/ai/tracker";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";

export type { InterviewQuestionItem };

/** Fetches persisted interview questions for a user-owned pipeline entry. */
export async function getInterviewQuestionsForEntry(
  pipelineEntryId: string,
  userId: string
): Promise<Result<{ id: string; questions: unknown; createdAt: Date } | null, AppError>> {
  return await interviewDal.getInterviewQuestionSetByEntryId(pipelineEntryId, userId);
}

/** Verifies or lazily ensures a pipeline entry exists for a user and canonical job ID. */
export async function resolveInterviewPipelineEntry(
  userId: string,
  jobId: string,
  pipelineEntryId?: string
): Promise<Result<{ pipelineEntryId: string; canonicalJobId: string }, AppError>> {
  if (pipelineEntryId) {
    const entryRes = await pipelineDal.getPipelineEntryById(pipelineEntryId, userId);
    if (!entryRes.ok || !entryRes.value) {
      return err(new AppError("NOT_FOUND", "Pipeline entry not found"));
    }
    if (entryRes.value.jobId !== jobId && entryRes.value.id !== jobId) {
      return err(
        new AppError("VALIDATION_ERROR", "Pipeline entry does not match submitted job")
      );
    }
    return ok({
      pipelineEntryId: entryRes.value.id,
      canonicalJobId: entryRes.value.jobId,
    });
  }

  const jobRes = await jobsDal.getJobById(jobId, userId);
  if (!jobRes.ok || !jobRes.value) {
    return err(new AppError("NOT_FOUND", "Job opportunity not found"));
  }

  if (jobRes.value.pipelineEntryId) {
    return ok({
      pipelineEntryId: jobRes.value.pipelineEntryId,
      canonicalJobId: jobRes.value.canonicalJobId ?? jobRes.value.id,
    });
  }

  const canonicalJobId = jobRes.value.canonicalJobId ?? jobRes.value.id;
  const ensured = await pipelineDal.ensurePipelineEntry(userId, canonicalJobId, "saved");
  if (!ensured.ok) return err(ensured.error);

  return ok({
    pipelineEntryId: ensured.value.id,
    canonicalJobId,
  });
}

const interviewQuestionsSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      category: z.enum(["behavioral", "technical", "situational", "role_specific"]),
      context: z.string(),
      suggestedTalkingPoints: z.array(z.string()),
    })
  ),
});

/** Generates role-specific interview questions and persists them for a pipeline entry. */
export async function generateInterviewQuestions(
  jobId: string,
  userId: string,
  pipelineEntryId: string,
  resumeId?: string
): Promise<Result<{ id: string; questions: unknown }, AppError>> {
  try {
    const [jobResult, resumeResult] = await Promise.all([
      jobsDal.getJobById(jobId, userId),
      resumeId
        ? resumeDal.getMasterResumeById(resumeId, userId)
        : resumeDal.getActiveMasterResume(userId),
    ]);

    if (!jobResult.ok || !jobResult.value) {
      return err(new AppError("NOT_FOUND", "Job opportunity not found"));
    }

    const job = jobResult.value;
    const activeResume = resumeResult.ok ? resumeResult.value : null;

    if (!activeResume || !activeResume.content) {
      return err(
        new AppError(
          "NO_MASTER_RESUME",
          "User master resume is not configured. Please upload or save your master resume first."
        )
      );
    }

    const {
      model,
      provider: activeProvider,
      modelId: activeModelId,
    } = await getActiveLanguageModel();

    const prompt = `You are an expert interview coach preparing a candidate for an interview.
Job Title: ${job.title}
Company: ${job.company}
Job Description:
"""
${job.description || "No description provided."}
"""

Candidate Resume:
"""
${activeResume.content}
"""

Generate 5 high-yield interview questions tailored to this role and this candidate's background. Include relevant talking points for each.`;

    const trackingResult = await withAiTracking(
      {
        userId,
        feature: "interview_prep",
        provider: activeProvider,
        model: activeModelId,
      },
      () =>
        generateText({
          model,
          prompt,
          timeout: 30_000,
          output: Output.object({
            schema: interviewQuestionsSchema,
          }),
        })
    );

    const generated = trackingResult.output?.questions || [];
    const saveRes = await interviewDal.createInterviewQuestionSet(
      pipelineEntryId,
      generated
    );

    if (!saveRes.ok) return err(saveRes.error);

    return ok({
      id: saveRes.value.id,
      questions: saveRes.value.questions,
      createdAt: saveRes.value.createdAt,
    });
  } catch (error) {
    console.error("[Interview Service] Error generating questions:", error);
    return err(
      new AppError("AI_GENERATION_FAILED", "Failed to generate interview questions", error)
    );
  }
}
