import "server-only";

import { generateText, Output } from "ai";
import { getGoogleModel } from "@/lib/ai";
import { z } from "zod";
import * as jobsDal from "@/dal/jobs.dal";
import * as resumeDal from "@/dal/resume.dal";
import * as interviewDal from "@/dal/interview.dal";
import { withAiTracking } from "@/services/ai/tracker";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";

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

    const model = getGoogleModel();

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
        provider: "google",
        model: model.modelId ?? "gemini",
      },
      () =>
        generateText({
          model,
          prompt,
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
    });
  } catch (error) {
    console.error("[Interview Service] Error generating questions:", error);
    return err(
      new AppError("AI_GENERATION_FAILED", "Failed to generate interview questions", error)
    );
  }
}
