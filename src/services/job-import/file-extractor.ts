import "server-only";

import zlib from "node:zlib";
import { ok, err, type Result } from "@/lib/result";
import { AppError } from "@/lib/errors";

export const MAX_JOB_FILE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_EXTRACTED_TEXT_CHARS = 20_000;
const MIN_EXTRACTED_TEXT_CHARS = 20;
const MAX_DOCX_ZIP_ENTRIES = 200;
const MAX_DOCX_ENTRY_BYTES = 10 * 1024 * 1024; // 10MB per entry
const MAX_DOCX_TOTAL_BYTES = 25 * 1024 * 1024; // 25MB total decompressed

const PDF_MIME = "application/pdf";
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const TXT_MIME = "text/plain";

/**
 * Verifies a DOCX ZIP archive stays within strict entry-count and decompressed-byte limits
 * before passing the buffer to `mammoth`, bounding both declared headers and inflated bytes.
 */
export function assertSafeDocxZip(fileBuffer: Buffer): Result<void, AppError> {
  if (fileBuffer.length < 22 || fileBuffer.readUInt32LE(0) !== 0x04034b50) {
    return err(
      new AppError(
        "VALIDATION_ERROR",
        "Invalid DOCX archive format. Please upload a valid .docx file."
      )
    );
  }

  let eocdOffset = -1;
  const minScan = Math.max(0, fileBuffer.length - 65_557);
  for (let i = fileBuffer.length - 22; i >= minScan; i--) {
    if (fileBuffer.readUInt32LE(i) === 0x06054b50) {
      const commentLen = fileBuffer.readUInt16LE(i + 20);
      if (i + 22 + commentLen === fileBuffer.length) {
        eocdOffset = i;
        break;
      }
    }
  }

  if (eocdOffset === -1) {
    return err(
      new AppError("VALIDATION_ERROR", "Malformed DOCX archive directory.")
    );
  }

  const totalEntries = fileBuffer.readUInt16LE(eocdOffset + 10);
  const centralDirSize = fileBuffer.readUInt32LE(eocdOffset + 12);
  const centralDirOffset = fileBuffer.readUInt32LE(eocdOffset + 16);

  if (totalEntries > MAX_DOCX_ZIP_ENTRIES) {
    return err(
      new AppError(
        "VALIDATION_ERROR",
        "DOCX archive contains too many entries to safely process."
      )
    );
  }

  if (centralDirOffset + centralDirSize > eocdOffset) {
    return err(
      new AppError("VALIDATION_ERROR", "Malformed DOCX central directory bounds.")
    );
  }

  let offset = centralDirOffset;
  let declaredTotal = 0;
  let actualTotal = 0;

  for (let entryIdx = 0; entryIdx < totalEntries; entryIdx++) {
    if (
      offset + 46 > centralDirOffset + centralDirSize ||
      fileBuffer.readUInt32LE(offset) !== 0x02014b50
    ) {
      return err(
        new AppError("VALIDATION_ERROR", "Malformed DOCX archive entry header.")
      );
    }

    const method = fileBuffer.readUInt16LE(offset + 10);
    const compressedSize = fileBuffer.readUInt32LE(offset + 20);
    const uncompressedSize = fileBuffer.readUInt32LE(offset + 24);
    const fileNameLen = fileBuffer.readUInt16LE(offset + 28);
    const extraLen = fileBuffer.readUInt16LE(offset + 30);
    const commentLen = fileBuffer.readUInt16LE(offset + 32);
    const localHeaderOffset = fileBuffer.readUInt32LE(offset + 42);

    if (
      uncompressedSize > MAX_DOCX_ENTRY_BYTES ||
      compressedSize > fileBuffer.length
    ) {
      return err(
        new AppError(
          "VALIDATION_ERROR",
          "DOCX archive entry exceeds allowed decompressed size limit."
        )
      );
    }

    declaredTotal += uncompressedSize;
    if (declaredTotal > MAX_DOCX_TOTAL_BYTES) {
      return err(
        new AppError(
          "VALIDATION_ERROR",
          "DOCX decompressed size exceeds the allowed safety limit."
        )
      );
    }

    if (
      localHeaderOffset + 30 > centralDirOffset ||
      fileBuffer.readUInt32LE(localHeaderOffset) !== 0x04034b50
    ) {
      return err(
        new AppError("VALIDATION_ERROR", "Malformed DOCX local file header.")
      );
    }

    const localNameLen = fileBuffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLen = fileBuffer.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const dataEnd = dataStart + compressedSize;

    if (dataEnd > centralDirOffset) {
      return err(
        new AppError("VALIDATION_ERROR", "Corrupted DOCX entry payload bounds.")
      );
    }

    const remainingBudget = MAX_DOCX_TOTAL_BYTES - actualTotal;
    const entryBudget = Math.min(MAX_DOCX_ENTRY_BYTES, remainingBudget);

    if (method === 0) {
      if (compressedSize > entryBudget) {
        return err(
          new AppError(
            "VALIDATION_ERROR",
            "DOCX decompressed size exceeds the allowed safety limit."
          )
        );
      }
      actualTotal += compressedSize;
    } else if (method === 8) {
      try {
        const inflated = zlib.inflateRawSync(
          fileBuffer.subarray(dataStart, dataEnd),
          { maxOutputLength: entryBudget }
        );
        actualTotal += inflated.byteLength;
      } catch {
        return err(
          new AppError(
            "VALIDATION_ERROR",
            "DOCX archive failed decompression or exceeds the memory safety limit."
          )
        );
      }
    } else {
      return err(
        new AppError(
          "VALIDATION_ERROR",
          "Unsupported compression method inside DOCX archive."
        )
      );
    }

    offset += 46 + fileNameLen + extraLen + commentLen;
  }

  return ok(undefined);
}

function resolveFileKind(
  mimeType: string,
  fileName: string,
): "pdf" | "docx" | "txt" | null {
  const mime = mimeType.trim().toLowerCase();
  const ext = fileName.trim().toLowerCase().split(".").pop() || "";

  if (mime === PDF_MIME || ext === "pdf") return "pdf";
  if (mime === DOCX_MIME || ext === "docx") {
    return "docx";
  }
  if (mime === TXT_MIME || ext === "txt") return "txt";
  return null;
}

/**
 * Extracts plain text from an uploaded PDF, DOCX, or TXT job posting file.
 * Runs before billing so invalid or unreadable files do not consume credits.
 */
export async function extractTextFromJobFile(
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<Result<string, AppError>> {
  if (!fileBuffer || fileBuffer.byteLength === 0) {
    return err(new AppError("VALIDATION_ERROR", "Uploaded file is empty."));
  }

  if (fileBuffer.byteLength > MAX_JOB_FILE_BYTES) {
    return err(
      new AppError(
        "VALIDATION_ERROR",
        "File exceeds the 5 MB maximum upload size.",
      ),
    );
  }

  const kind = resolveFileKind(mimeType, fileName);
  if (!kind) {
    return err(
      new AppError(
        "VALIDATION_ERROR",
        "Unsupported file type. Please upload a PDF, DOCX, or TXT file.",
      ),
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
      const zipCheck = assertSafeDocxZip(fileBuffer);
      if (!zipCheck.ok) {
        return err(zipCheck.error);
      }
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
          "Could not extract enough readable text from this file. If it is a scanned image PDF, please copy-paste the text instead.",
        ),
      );
    }

    return ok(cleaned.slice(0, MAX_EXTRACTED_TEXT_CHARS));
  } catch (error) {
    return err(
      new AppError(
        "VALIDATION_ERROR",
        "Failed to read document content. Please verify the file is not corrupted or password-protected.",
        error,
      ),
    );
  }
}
