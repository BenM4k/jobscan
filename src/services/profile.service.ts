import "server-only";
import * as profileDal from "@/dal/profile.dal";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";
import mammoth from "mammoth";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");



export async function parseResumeFile(
  fileBuffer: Buffer,
  mimeType: string
): Promise<Result<string, AppError>> {
  try {
    if (mimeType === "application/pdf") {
      const parsed = await pdfParse(fileBuffer);
      return ok(parsed.text);
    } else if (
      mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType === "application/msword"
    ) {
      const parsed = await mammoth.extractRawText({ buffer: fileBuffer });
      return ok(parsed.value);
    } else {
      // Plain text fallback
      return ok(fileBuffer.toString("utf-8"));
    }
  } catch (error) {
    return err(
      new AppError("VALIDATION_ERROR", "Failed to parse document content", error)
    );
  }
}

export async function updateProfileDetails(data: {
  resumeText: string;
  skills?: string[];
  aiProvider?: string;
}): Promise<Result<profileDal.ProfileSelect, AppError>> {
  return await profileDal.upsertProfile(data);
}

export async function getUserProfile(): Promise<
  Result<profileDal.ProfileSelect | null, AppError>
> {
  return await profileDal.getProfile();
}

export async function reformatProfileWithGemini(
  targetResumeText?: string
): Promise<Result<profileDal.ProfileSelect, AppError>> {
  const currentProfileResult = await profileDal.getProfile();
  const textToFormat =
    targetResumeText ||
    (currentProfileResult.ok ? currentProfileResult.value?.resumeText : "") ||
    "";

  if (!textToFormat.trim()) {
    return err(new AppError("VALIDATION_ERROR", "No resume text found to format. Please upload or enter resume text first."));
  }

  const { formatResumeWithGemini } = await import("@/services/ai/gemini-profile-formatter");
  const formatResult = await formatResumeWithGemini(textToFormat);
  if (!formatResult.ok) {
    return err(formatResult.error);
  }

  const formattedData = formatResult.value;

  // Merge existing skills with Gemini extracted skills
  const existingSkills = currentProfileResult.ok ? currentProfileResult.value?.skills || [] : [];
  const combinedSkills = Array.from(
    new Set([...existingSkills, ...formattedData.extractedSkills])
  );

  return await profileDal.upsertProfile({
    resumeText: formattedData.cleanFormattedResume,
    skills: combinedSkills,
    aiProvider: "gemini",
  });
}
