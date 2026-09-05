import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-guard";
import { runWithIdempotency } from "@/services/idempotency.service";
import { generateTailoredResume } from "@/services/tailoring.service";
import * as jobsDal from "@/dal/jobs.dal";
import { ok } from "@/lib/result";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const result = await runWithIdempotency({
      userId,
      action: "generate_tailored_resume",
      key: idempotencyKey,
      execute: async () => {
        const tailorRes = await generateTailoredResume(id, userId);
        if (!tailorRes.ok) {
          return tailorRes;
        }

        return ok({
          data: tailorRes.value,
          resultRef: tailorRes.value.tailoredResumeRecordId,
        });
      },
      resolveExisting: async (record) => {
        const existingJobRes = await jobsDal.getJobById(id, userId);
        if (!existingJobRes.ok) return existingJobRes;
        if (!existingJobRes.value) {
          const { AppError } = await import("@/lib/errors");
          return { ok: false, error: new AppError("NOT_FOUND", "Job opportunity not found") };
        }
        return ok({
          job: existingJobRes.value,
          tailoredResumeText: existingJobRes.value.tailoredResume || "",
          structured: existingJobRes.value.tailoredResumeData || null,
          tailoredResumeRecordId: record.resultRef || undefined,
        });
      },
    });

    if (!result.ok) {
      if (result.error.code === "OPERATION_IN_PROGRESS") {
        return NextResponse.json(
          { error: "Tailored resume generation is currently in progress", inProgress: true },
          { status: 409 }
        );
      }
      if (result.error.code === "NO_MASTER_RESUME") {
        return NextResponse.json(
          { error: result.error.message },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: result.error.message || "Failed to tailor resume" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.value.data.job,
      tailoredResume: result.value.data.tailoredResumeText,
      structured: result.value.data.structured,
      isCached: result.value.isCached,
    });
  } catch (error) {
    console.error("Tailor resume error:", error);
    return NextResponse.json(
      { error: "Failed to tailor resume" },
      { status: 500 },
    );
  }
}
