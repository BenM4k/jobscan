import "server-only";

import { generateText, Output } from "ai";
import { getGoogleModel, TailoredResumeSchema } from "@/lib/ai";
import * as jobsDal from "@/dal/jobs.dal";
import * as resumeDal from "@/dal/resume.dal";
import * as tailoringDal from "@/dal/tailoring.dal";
import { withAiTracking } from "@/services/ai/tracker";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";
import {
  buildResumeTailoringInstructions,
  buildResumeTailoringPrompt,
  type TailoringLanguage,
} from "@/services/tailoring/resume-prompt";
import {
  buildCoverLetterInstructions,
  buildCoverLetterPrompt,
} from "@/services/tailoring/cover-letter-prompt";
import { formatTailoredResumeText } from "@/services/tailoring/format-resume";
import {
  extractContactDetails,
  stripRedactionPlaceholders,
} from "@/services/tailoring/sanitize";

// Prompt builders are re-exported for the streaming cover-letter route and unit tests.
export {
  buildCoverLetterInstructions,
  buildCoverLetterPrompt,
} from "@/services/tailoring/cover-letter-prompt";
export type { CoverLetterPromptOptions } from "@/services/tailoring/cover-letter-prompt";

const RESUME_TIMEOUT_MS = 90_000;
const COVER_LETTER_TIMEOUT_MS = 60_000;

type MasterResume = NonNullable<
  Extract<Awaited<ReturnType<typeof resumeDal.getActiveMasterResume>>, { ok: true }>["value"]
>;

interface TailoringContext {
  job: jobsDal.JobSelect;
  resume: MasterResume & { content: string };
  resumeSkills: string[];
  outputLanguage: TailoringLanguage;
  location: string;
}

/** Writes in the posting's language so ATS keyword matching uses the employer's terms. */
export function resolveOutputLanguage(
  jobLanguage?: string | null,
  resumeLanguage?: string | null
): TailoringLanguage {
  const candidate = jobLanguage || resumeLanguage;
  return candidate === "fr" ? "fr" : "en";
}

/** Formats a job's location for prompting. */
export function formatJobLocation(job: jobsDal.JobSelect): string {
  return (
    job.location ||
    [job.city, job.countryCode || job.country].filter(Boolean).join(", ") ||
    "Unspecified"
  );
}

/** Loads and validates the job, master resume, and skills needed by both generators. */
async function loadTailoringContext(
  jobId: string,
  userId: string,
  resumeId?: string
): Promise<Result<TailoringContext, AppError>> {
  const [jobResult, resumeResult] = await Promise.all([
    jobsDal.getJobById(jobId, userId),
    resumeId
      ? resumeDal.getMasterResumeById(resumeId, userId)
      : resumeDal.getActiveMasterResume(userId),
  ]);

  if (!jobResult.ok || !jobResult.value) {
    return err(new AppError("NOT_FOUND", "Job opportunity not found"));
  }

  const resume = resumeResult.ok ? resumeResult.value : null;
  if (!resume || !resume.content) {
    return err(
      new AppError(
        "NO_MASTER_RESUME",
        "User master resume is not configured. Please upload or save your master resume first."
      )
    );
  }

  const job = jobResult.value;
  const skillsResult = await resumeDal.getResumeSkills(resume.id);

  return ok({
    job,
    resume: { ...resume, content: resume.content },
    resumeSkills: skillsResult.ok ? skillsResult.value : [],
    outputLanguage: resolveOutputLanguage(job.language, resume.language),
    location: formatJobLocation(job),
  });
}

export interface TailoredResumeResult {
  job: jobsDal.JobSelect;
  tailoredResumeText: string;
  structured: unknown;
  tailoredResumeRecordId?: string;
}

/** Generates an ATS-optimized, job-specific rewrite of the user's master resume. */
export async function generateTailoredResume(
  jobId: string,
  userId: string,
  resumeId?: string,
): Promise<Result<TailoredResumeResult, AppError>> {
  try {
    const contextRes = await loadTailoringContext(jobId, userId, resumeId);
    if (!contextRes.ok) return contextRes;
    const { job, resume, resumeSkills, outputLanguage, location } = contextRes.value;

    const model = getGoogleModel();
    const instructions = buildResumeTailoringInstructions(outputLanguage);
    const prompt = buildResumeTailoringPrompt({
      resumeText: resume.content,
      candidateSkills: resumeSkills,
      jobTitle: job.title,
      company: job.company,
      location,
      jobDescription: job.description,
      matchedSkills: job.matchedSkills,
      missingSkills: job.missingSkills,
      gaps: job.gaps,
    });

    let object;
    try {
      const result = await withAiTracking(
        {
          userId,
          feature: "tailored_resume",
          provider: "google",
          model: model.modelId ?? "gemini",
        },
        () =>
          generateText({
            model,
            instructions,
            prompt,
            output: Output.object({ schema: TailoredResumeSchema }),
            timeout: RESUME_TIMEOUT_MS,
            telemetry: { isEnabled: false },
          })
      );
      object = result.output;
    } catch (aiError) {
      console.error("AI resume tailoring call failed:", {
        jobId: job.id,
        name: aiError instanceof Error ? aiError.name : "Unknown",
        message: aiError instanceof Error ? aiError.message : String(aiError),
      });
      return err(
        new AppError(
          "AI_PROVIDER_ERROR",
          "Failed to tailor resume with AI provider",
          aiError
        )
      );
    }

    // Contact details were redacted from the prompt; re-insert them from the original resume.
    const tailoredResumeText = formatTailoredResumeText(
      object,
      extractContactDetails(resume.content),
      outputLanguage
    );

    const updateResult = await jobsDal.updateJobTailoredResume(
      job.id,
      tailoredResumeText,
      object,
      userId,
      resume.id,
      outputLanguage
    );

    if (!updateResult.ok) {
      return err(updateResult.error);
    }

    const tailoredResumeRecord = await tailoringDal.getTailoredResume(job.id);
    const tailoredResumeRecordId = tailoredResumeRecord.ok && tailoredResumeRecord.value
      ? tailoredResumeRecord.value.id
      : undefined;

    return ok({
      job: updateResult.value,
      tailoredResumeText,
      structured: object,
      tailoredResumeRecordId,
    });
  } catch (error) {
    return err(
      new AppError("INTERNAL_ERROR", "Failed to tailor resume", error)
    );
  }
}

export interface TailoredCoverLetterResult {
  job: jobsDal.JobSelect;
  coverLetter: string;
  coverLetterRecordId?: string;
}

export interface GenerateTailoredCoverLetterOptions {
  resumeId?: string;
  regenerate?: boolean;
  instructions?: string;
  tone?: string;
}

/** Generates (or regenerates) a job-specific cover letter grounded in the master resume. */
export async function generateTailoredCoverLetter(
  jobId: string,
  userId: string,
  options?: GenerateTailoredCoverLetterOptions | string
): Promise<Result<TailoredCoverLetterResult, AppError>> {
  try {
    const opts: GenerateTailoredCoverLetterOptions =
      typeof options === "string" ? { resumeId: options } : options || {};

    const contextRes = await loadTailoringContext(jobId, userId, opts.resumeId);
    if (!contextRes.ok) return contextRes;
    const { job, resume, resumeSkills, outputLanguage, location } = contextRes.value;

    const previousCoverLetter = job.coverLetterDraft || null;
    const isRegeneration = Boolean(opts.regenerate);
    const model = getGoogleModel();

    const instructions = buildCoverLetterInstructions({
      isRegeneration,
      instructions: opts.instructions,
      tone: opts.tone,
      outputLanguage,
    });

    const prompt = buildCoverLetterPrompt({
      candidateSkills: resumeSkills,
      resumeText: resume.content,
      jobTitle: job.title,
      company: job.company,
      location,
      jobDescription: job.description,
      matchedSkills: job.matchedSkills,
      missingSkills: job.missingSkills,
      isRegeneration,
      previousCoverLetter,
      instructions: opts.instructions,
      tone: opts.tone,
    });

    let text = "";
    try {
      const result = await withAiTracking(
        {
          userId,
          feature: "tailored_cover_letter",
          provider: "google",
          model: model.modelId ?? "gemini",
        },
        () =>
          generateText({
            model,
            instructions,
            prompt,
            timeout: COVER_LETTER_TIMEOUT_MS,
            telemetry: { isEnabled: false },
          })
      );
      text = stripRedactionPlaceholders(result.text);
    } catch (aiError) {
      return err(
        new AppError(
          "AI_PROVIDER_ERROR",
          "Failed to generate cover letter with AI provider",
          aiError
        )
      );
    }

    const diffFromPrevious = previousCoverLetter
      ? {
          isRegeneration: true,
          regeneratedAt: new Date().toISOString(),
          previousLength: previousCoverLetter.length,
          newLength: text.length,
          instructions: opts.instructions || null,
          tone: opts.tone || null,
        }
      : null;

    const updateResult = await jobsDal.updateJobCoverLetter(
      job.id,
      userId,
      text,
      resume.id,
      diffFromPrevious
    );
    if (!updateResult.ok) {
      return err(updateResult.error);
    }

    const clRecord = await tailoringDal.getTailoredCoverLetter(job.id);
    const coverLetterRecordId = clRecord.ok && clRecord.value
      ? clRecord.value.id
      : undefined;

    return ok({
      job: updateResult.value,
      coverLetter: text,
      coverLetterRecordId,
    });
  } catch (error) {
    return err(
      new AppError("INTERNAL_ERROR", "Failed to generate cover letter", error)
    );
  }
}
