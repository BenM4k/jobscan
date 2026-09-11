import { NextRequest, NextResponse } from "next/server";
import { streamText, toTextStream, createTextStreamResponse } from "ai";
import { getGoogleModel } from "@/lib/ai";
import { requireSession } from "@/lib/auth-guard";
import { checkAiRateLimit } from "@/services/rate-limit";
import * as jobsDal from "@/dal/jobs.dal";
import * as resumeDal from "@/dal/resume.dal";
import * as opsDal from "@/dal/ops.dal";
import * as tailoringDal from "@/dal/tailoring.dal";
import * as idempotencyDal from "@/dal/idempotency.dal";
import { uuidKeySchema } from "@/services/idempotency.service";
import {
  buildCoverLetterInstructions,
  buildCoverLetterPrompt,
} from "@/services/tailoring.service";
import { coverLetterPromptFieldsSchema } from "@/actions/job.schema";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let idempotencyRecordId: string | null = null;
  let idempotencyAttemptId: string | null = null;

  try {
    const sessionResult = await requireSession();
    if (!sessionResult.ok || !sessionResult.value) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing job ID" }, { status: 400 });
    }

    const userId = sessionResult.value.user.id;

    // Rate limiting check before paid cover letter generation
    const rateLimitRes = await checkAiRateLimit(userId, "tailored_cover_letter");
    if (!rateLimitRes.allowed) {
      return NextResponse.json(
        {
          error: `Rate limit exceeded for cover letter generation. Please wait ${rateLimitRes.retryAfterSeconds}s before retrying.`,
          code: "rate_limited",
          retryAfterSeconds: rateLimitRes.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimitRes.retryAfterSeconds),
          },
        }
      );
    }

    // Extract request options from body / query params
    let reqBody: Record<string, unknown> | null = null;
    try {
      const contentType = _req.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        reqBody = await _req.json();
      }
    } catch {
      // Body may be empty
    }

    const idempotencyKey =
      _req.headers.get("x-idempotency-key") ||
      _req.headers.get("idempotency-key") ||
      (typeof reqBody?.idempotencyKey === "string" ? reqBody.idempotencyKey : null);

    if (!idempotencyKey) {
      return NextResponse.json(
        {
          error:
            "Missing required idempotency key (header Idempotency-Key or body.idempotencyKey)",
        },
        { status: 400 }
      );
    }

    const parsedKey = uuidKeySchema.safeParse(idempotencyKey);
    if (!parsedKey.success) {
      return NextResponse.json(
        {
          error: "Invalid idempotency key format: must be a valid UUID",
        },
        { status: 400 }
      );
    }

    const isRegenerateRequested =
      reqBody?.regenerate === true ||
      reqBody?.isRegeneration === true ||
      _req.nextUrl.searchParams.get("regenerate") === "true";

    const rawInstructions =
      typeof reqBody?.instructions === "string"
        ? reqBody.instructions.trim()
        : typeof reqBody?.feedback === "string"
          ? reqBody.feedback.trim()
          : undefined;

    const rawTone =
      typeof reqBody?.tone === "string" ? reqBody.tone.trim() : undefined;

    // Apply shared field-level validation to custom prompt inputs
    const validatedPromptFields = coverLetterPromptFieldsSchema.safeParse({
      instructions: rawInstructions,
      tone: rawTone,
    });

    if (!validatedPromptFields.success) {
      return NextResponse.json(
        {
          error:
            validatedPromptFields.error.issues[0]?.message ||
            "Invalid instructions or tone parameters",
        },
        { status: 400 }
      );
    }

    const customInstructions = validatedPromptFields.data.instructions;
    const tone = validatedPromptFields.data.tone;

    const resumeId =
      typeof reqBody?.resumeId === "string"
        ? reqBody.resumeId
        : _req.nextUrl.searchParams.get("resumeId") || undefined;

    const validKey = parsedKey.data;
    const beginRes = await idempotencyDal.beginIdempotentAction(
      userId,
      "generate_tailored_cover_letter",
      validKey,
      id
    );

    if (!beginRes.ok) {
      return NextResponse.json(
        { error: "Failed to initialize idempotency transaction" },
        { status: 500 }
      );
    }

    const state = beginRes.value;
    idempotencyRecordId = state.record.id;
    if (state.type === "locked") {
      idempotencyAttemptId = state.attemptId;
    }

    if (state.type === "in_progress") {
      return NextResponse.json(
        {
          error: "Cover letter generation is currently in progress",
          inProgress: true,
        },
        { status: 409 }
      );
    }

    if (state.type === "completed") {
      // If regeneration is explicitly requested, reopen the idempotency record instead of returning stale cache
      if (isRegenerateRequested) {
        const reopenRes = await idempotencyDal.reopenIdempotentAction(state.record.id, id);
        if (reopenRes.ok) {
          idempotencyAttemptId = reopenRes.value.attemptId;
        } else {
          return NextResponse.json(
            { error: "Failed to reset idempotency transaction for regeneration" },
            { status: 500 }
          );
        }
      } else {
        const storedTarget = state.record.targetId || id;
        if (state.record.targetId && state.record.targetId !== id) {
          return NextResponse.json(
            {
              error: `Idempotency key was completed for target job ${state.record.targetId}, cannot reuse for ${id}`,
            },
            { status: 409 }
          );
        }

        let cachedText = "";
        if (state.record.resultRef) {
          const clRecord = await tailoringDal.getTailoredCoverLetter(storedTarget);
          if (clRecord.ok && clRecord.value?.content) {
            cachedText = clRecord.value.content;
          }
        }

        if (!cachedText) {
          const existingJobRes = await jobsDal.getJobById(storedTarget, userId);
          if (existingJobRes.ok && existingJobRes.value?.coverLetterDraft) {
            cachedText = existingJobRes.value.coverLetterDraft;
          }
        }

        if (cachedText) {
          return new Response(cachedText, {
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "X-Idempotent-Cached": "true",
            },
          });
        }

        return NextResponse.json(
          { error: "Completed cover letter could not be resolved from cache" },
          { status: 404 }
        );
      }
    }

    const [jobResult, resumeResult] = await Promise.all([
      jobsDal.getJobById(id, userId),
      resumeId
        ? resumeDal.getMasterResumeById(resumeId, userId)
        : resumeDal.getActiveMasterResume(userId),
    ]);

    const skillsResult =
      resumeResult.ok && resumeResult.value
        ? await resumeDal.getResumeSkills(resumeResult.value.id)
        : { ok: true as const, value: [] as string[] };

    if (!jobResult.ok || !jobResult.value) {
      if (idempotencyAttemptId && idempotencyRecordId) {
        await idempotencyDal.failIdempotentAction(idempotencyRecordId, idempotencyAttemptId);
      }
      return NextResponse.json(
        { error: "Job opportunity not found" },
        { status: 404 },
      );
    }

    const job = jobResult.value;
    const activeResume = resumeResult.ok ? resumeResult.value : null;

    if (!activeResume || !activeResume.content) {
      if (idempotencyAttemptId && idempotencyRecordId) {
        await idempotencyDal.failIdempotentAction(idempotencyRecordId, idempotencyAttemptId);
      }
      return NextResponse.json(
        {
          error:
            "User master resume is not configured. Please upload or save your master resume first.",
        },
        { status: 400 },
      );
    }

    const previousCoverLetter = job.coverLetterDraft || null;
    const isRegeneration = Boolean(isRegenerateRequested);
    const resumeText = activeResume.content;
    const resumeSkills: string[] = skillsResult.ok ? skillsResult.value : [];
    const model = getGoogleModel();

    const instructions = buildCoverLetterInstructions({
      isRegeneration,
      instructions: customInstructions,
      tone,
    });

    const location =
      [job.city, job.countryCode || job.country].filter(Boolean).join(", ") ||
      "Unspecified";

    const prompt = buildCoverLetterPrompt({
      candidateSkills: resumeSkills,
      resumeText,
      jobTitle: job.title,
      company: job.company,
      location,
      jobDescription: job.description,
      isRegeneration,
      previousCoverLetter,
      instructions: customInstructions,
      tone,
    });

    const result = streamText({
      model,
      instructions,
      prompt,
      temperature: isRegeneration ? 0.6 : 0.4,
      timeout: 30_000,
      telemetry: { isEnabled: false },
      onFinish: async ({ text }) => {
        try {
          if (text && text.trim().length > 0) {
            const newText = text.trim();
            const diffFromPrevious = previousCoverLetter
              ? {
                  isRegeneration: true,
                  regeneratedAt: new Date().toISOString(),
                  previousLength: previousCoverLetter.length,
                  newLength: newText.length,
                  instructions: customInstructions || null,
                  tone: tone || null,
                }
              : null;

            await jobsDal.updateJobCoverLetter(
              job.id,
              userId,
              newText,
              activeResume.id,
              diffFromPrevious
            );

            await opsDal.logAiCall({
              userId,
              feature: "tailored_cover_letter",
              provider: "google",
              model: model.modelId ?? "gemini",
              costEstimateUsd: "0.001",
            });

            const clRecord = await tailoringDal.getTailoredCoverLetter(job.id);
            const clRecordId =
              clRecord.ok && clRecord.value ? clRecord.value.id : job.id;

            if (idempotencyAttemptId && idempotencyRecordId) {
              const completeRes = await idempotencyDal.completeIdempotentAction(
                idempotencyRecordId,
                idempotencyAttemptId,
                clRecordId
              );
              if (!completeRes.ok) {
                console.error("Failed to complete idempotency key for cover letter:", completeRes.error);
                await idempotencyDal.failIdempotentAction(idempotencyRecordId, idempotencyAttemptId);
              }
            }
          } else {
            if (idempotencyAttemptId && idempotencyRecordId) {
              await idempotencyDal.failIdempotentAction(idempotencyRecordId, idempotencyAttemptId);
            }
          }
        } catch (saveError) {
          if (idempotencyAttemptId && idempotencyRecordId) {
            await idempotencyDal.failIdempotentAction(idempotencyRecordId, idempotencyAttemptId);
          }
          console.error("Failed to save streamed cover letter in background:", {
            jobId: job.id,
            name: saveError instanceof Error ? saveError.name : "Unknown",
            message:
              saveError instanceof Error
                ? saveError.message
                : String(saveError),
          });
        }
      },
    });

    return createTextStreamResponse({
      stream: toTextStream({ stream: result.stream }),
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Is-Regeneration": isRegeneration ? "true" : "false",
      },
    });
  } catch (error) {
    if (idempotencyRecordId && idempotencyAttemptId) {
      await idempotencyDal.failIdempotentAction(idempotencyRecordId, idempotencyAttemptId);
    }
    console.error("Cover letter stream error:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to generate cover letter" },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const sessionResult = await requireSession();
    if (!sessionResult.ok || !sessionResult.value) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const coverLetter = body.coverLetter;

    if (typeof coverLetter !== "string") {
      return NextResponse.json(
        { error: "Invalid cover letter content" },
        { status: 400 },
      );
    }

    const updateRes = await jobsDal.updateJobCoverLetter(id, sessionResult.value.user.id, coverLetter);
    if (!updateRes.ok) {
      console.error("Failed to save cover letter:", { jobId: id });
      return NextResponse.json(
        { error: "Failed to save cover letter" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data: updateRes.value });
  } catch (error) {
    console.error("Save cover letter error:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to save cover letter" },
      { status: 500 },
    );
  }
}
