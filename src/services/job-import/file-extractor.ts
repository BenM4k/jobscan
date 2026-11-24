import "server-only";

import { ok, err, type Result } from "@/lib/result";
import { AppError } from "@/lib/errors";

export const MAX_JOB_FILE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_EXTRACTED_TEXT_CHARS = 20_000;
const MIN_EXTRACTED_TEXT_CHARS = 20;

const PDF_MIME = "application/pdf";
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const DOC_MIME = "application/msword";
const TXT_MIME = "text/plain";

function resolveFileKind(
  mimeType: string,
  fileName: string
): "pdf" | "docx" | "txt" | null {
  const mime = mimeType.trim().toLowerCase();
  const ext = fileName.trim().toLowerCase().split(".").pop() || "";

  if (mime === PDF_MIME || ext === "pdf") return "pdf";
  if (mime === DOCX_MIME || mime === DOC_MIME || ext === "docx" || ext === "doc") {
    return "docx";
  }
  if (mime === TXT_MIME || ext === "txt") return "txt";
  return null;
}

/**
 * Extracts plain text from an uploaded PDF, DOCX/DOC, or TXT job posting file.
 * Runs before billing so invalid or unreadable files do not consume credits.
 */
export async function extractTextFromJobFile(
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<Result<string, AppError>> {
  if (!fileBuffer || fileBuffer.byteLength === 0) {
    return err(new AppError("VALIDATION_ERROR", "Uploaded file is empty."));
  }

  if (fileBuffer.byteLength > MAX_JOB_FILE_BYTES) {
    return err(
      new AppError(
        "VALIDATION_ERROR",
        "File exceeds the 5 MB maximum upload size."
      )
    );
  }

  const kind = resolveFileKind(mimeType, fileName);
  if (!kind) {
    return err(
      new AppError(
        "VALIDATION_ERROR",
        "Unsupported file type. Please upload a PDF, DOCX, DOC, or TXT file."
      )
    );
  }

  try {
    let rawText = "";

    if (kind === "pdf") {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(fileBuffer));
      const { text } = await extractText(pdf, { mergePages: true });
      rawText = text || "";
    } else if (kind === "docx") {
      const mammoth = await import("mammoth");
      const parsed = await mammoth.extractRawText({ buffer: fileBuffer });
      rawText = parsed.value || "";
    } else {
      rawText = fileBuffer.toString("utf-8");
    }

    const cleaned = rawText
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (cleaned.length < MIN_EXTRACTED_TEXT_CHARS) {
      return err(
        new AppError(
          "VALIDATION_ERROR",
          "Could not extract enough readable text from this file. If it is a scanned image PDF, please copy-paste the text instead."
        )
      );
    }

    return ok(cleaned.slice(0, MAX_EXTRACTED_TEXT_CHARS));
  } catch (error) {
    return err(
      new AppError(
        "VALIDATION_ERROR",
        "Failed to read document content. Please verify the file is not corrupted or password-protected.",
        error
      )
    );
  }
}
