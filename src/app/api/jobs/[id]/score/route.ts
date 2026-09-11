import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as jobsDal from "@/dal/jobs.dal";
import { requireSession } from "@/lib/auth-guard";
import { runWithIdempotency } from "@/services/idempotency.service";
import { checkAiRateLimit } from "@/services/rate-limit";
import { ok } from "@/lib/result";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing job ID" }, { status: 400 });
    }

    const sessionResult = await requireSession();
    if (!sessionResult.ok || !sessionResult.value) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = sessionResult.value.user.id;

    // Rate limiting check before paid operation
    const rateLimitRes = await checkAiRateLimit(userId, "scoring");
    if (!rateLimitRes.allowed) {
      return NextResponse.json(
        {
          error: `Rate limit exceeded for AI scoring. Please wait ${rateLimitRes.retryAfterSeconds}s before retrying.`,
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

    // Extract idempotency key from header or body
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

    const rawResumeId =
      typeof reqBody?.resumeId === "string"
        ? reqBody.resumeId
        : _req.nextUrl.searchParams.get("resumeId") || undefined;

    let resumeId: string | undefined = undefined;
    if (rawResumeId) {
      const parsedResumeId = z.string().uuid().safeParse(rawResumeId);
      if (!parsedResumeId.success) {
        return NextResponse.json(
          { error: "Invalid resume ID format: must be a valid UUID" },
          { status: 400 }
        );
      }
      resumeId = parsedResumeId.data;
    }

    const result = await runWithIdempotency({
      userId,
      action: "run_scoring",
      key: idempotencyKey,
      targetId: id,
      execute: async () => {
        const { scoreJobWithAI } = await import("@/services/job.service");
        const scoreRes = await scoreJobWithAI(id, userId, undefined, resumeId);
        if (!scoreRes.ok) {
          return scoreRes;
        }

        const job = scoreRes.value;
        return ok({
          data: {
            job,
            score: {
              overallScore: job.fitScore ?? 0,
              matchedSkills: job.matchedSkills ?? [],
              missingSkills: job.missingSkills ?? [],
              gaps: job.gaps ?? [],
              reasoning: job.scoreReasoning ?? "",
            },
          },
          resultRef: job.id,
        });
      },
      resolveExisting: async (record) => {
        const targetJobId = record.targetId || id;
        const existingJobRes = await jobsDal.getJobById(targetJobId, userId);
        if (!existingJobRes.ok) return existingJobRes;
        if (!existingJobRes.value) {
          const { AppError } = await import("@/lib/errors");
          return { ok: false, error: new AppError("NOT_FOUND", "Job opportunity not found") };
        }
        return ok({
          job: existingJobRes.value,
          score: {
            overallScore: existingJobRes.value.fitScore ?? 0,
            matchedSkills: existingJobRes.value.matchedSkills ?? [],
            missingSkills: existingJobRes.value.missingSkills ?? [],
            gaps: existingJobRes.value.gaps ?? [],
            reasoning: existingJobRes.value.scoreReasoning ?? "",
          },
        });
      },
    });

    if (!result.ok) {
      if (result.error.code === "OPERATION_IN_PROGRESS") {
        return NextResponse.json(
          { error: "Job scoring is currently in progress", inProgress: true },
          { status: 409 }
        );
      }
      if (result.error.code === "NOT_FOUND") {
        return NextResponse.json(
          { error: result.error.message || "Requested resume persona not found" },
          { status: 404 }
        );
      }
      if (result.error.code === "NO_MASTER_RESUME") {
        return NextResponse.json(
          { error: result.error.message },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: result.error.message || "Failed to score job" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.value.data.job,
      score: result.value.data.score,
      isCached: result.value.isCached,
    });
  } catch (error) {
    console.error("Job scoring error:", error);
    return NextResponse.json({ error: "Failed to score job" }, { status: 500 });
  }
}
