import { NextRequest, NextResponse } from "next/server";
import { parseResumeFile } from "@/services/profile.service";

export async function POST(req: NextRequest) {
  try {
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

    const mimeType = file.type || "application/octet-stream";
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
        { error: "Could not extract readable text from document. Please ensure file contains selectable text." },
        { status: 422 }
      );
    }

    return NextResponse.json({ text: rawText });
  } catch (error) {
    console.error("Resume parse error:", error);
    const message = error instanceof Error ? error.message : "Failed to parse resume file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
