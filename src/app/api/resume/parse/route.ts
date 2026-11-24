import { NextRequest, NextResponse } from "next/server";
import { parseResumeFile } from "@/services/profile.service";
import { requireSession } from "@/lib/auth-guard";
import { checkRateLimit } from "@/services/ai/rate-limit";

const MAX_RESUME_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
]);

const EXTENSION_MIME_MAP: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".txt": "text/plain",
  ".md": "text/markdown",
};

function resolveAllowedMimeType(file: Blob): string | null {
  const rawType = (file.type || "").toLowerCase().trim();
  if (rawType && rawType !== "application/octet-stream") {
    return ALLOWED_MIME_TYPES.has(rawType) ? rawType : null;
  }

  if (file instanceof File && file.name) {
    const lowerName = file.name.toLowerCase();
    for (const [ext, mime] of Object.entries(EXTENSION_MIME_MAP)) {
      if (lowerName.endsWith(ext)) {
        return mime;
      }
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const sessionResult = await requireSession();
    if (!sessionResult.ok || !sessionResult.value) {
      const status =
        !sessionResult.ok && sessionResult.error.code === "FORBIDDEN" ? 403 : 401;
      return NextResponse.json(
        { error: status === 403 ? "Account suspended" : "Unauthorized" },
        { status }
      );
    }

    const userId = sessionResult.value.user.id;
    const rateLimit = await checkRateLimit(userId, "resume_parse", {
      capacity: 15,
      refillRatePerSec: 0.25,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait before uploading again." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "No valid file uploaded. Please select a PDF, DOCX, or text file." },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "Uploaded file is empty." },
        { status: 400 }
      );
    }

    if (file.size > MAX_RESUME_FILE_BYTES) {
      return NextResponse.json(
        { error: "Uploaded file exceeds the 5 MB size limit." },
        { status: 413 }
      );
    }

    const mimeType = resolveAllowedMimeType(file);
    if (!mimeType) {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload a PDF, DOCX, or TXT file." },
        { status: 415 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const parseResult = await parseResumeFile(buffer, mimeType);

    if (!parseResult.ok) {
      return NextResponse.json(
        { error: parseResult.error.message },
        { status: 422 }
      );
    }

    const rawText = parseResult.value.trim();
    if (!rawText) {
      return NextResponse.json(
        {
          error:
            "Could not extract readable text from document. Please ensure file contains selectable text.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ text: rawText });
  } catch (error) {
    console.error("Resume parse error:", error);
    return NextResponse.json(
      { error: "Failed to parse resume file" },
      { status: 500 }
    );
  }
}
