import "server-only";
import * as profileDal from "@/dal/profile.dal";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";

export async function parseResumeFile(
  fileBuffer: Buffer,
  mimeType: string
): Promise<Result<string, AppError>> {
  try {
    if (mimeType === "application/pdf") {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(fileBuffer));
      const { text } = await extractText(pdf, { mergePages: true });
      return ok(text || "");
    } else if (
      mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType === "application/msword"
    ) {
      const mammoth = await import("mammoth");
      const parsed = await mammoth.extractRawText({ buffer: fileBuffer });
      return ok(parsed.value || "");
    } else {
      // Plain text fallback
      return ok(fileBuffer.toString("utf-8"));
    }
  } catch (error) {
    return err(
      new AppError(
        "VALIDATION_ERROR",
        "Failed to parse document content",
        error
      )
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
    return err(
      new AppError(
        "VALIDATION_ERROR",
        "No resume text found to format. Please upload or enter resume text first."
      )
    );
  }

  const { formatResumeWithGemini } = await import(
    "@/services/ai/gemini-profile-formatter"
  );
  const formatResult = await formatResumeWithGemini(textToFormat);
  if (!formatResult.ok) {
    return err(formatResult.error);
  }

  const formattedData = formatResult.value;

  // Merge existing skills with Gemini extracted skills
  const existingSkills = currentProfileResult.ok
    ? currentProfileResult.value?.skills || []
    : [];
  const combinedSkills = Array.from(
    new Set([...existingSkills, ...formattedData.extractedSkills])
  );

  return await profileDal.upsertProfile({
    resumeText: formattedData.cleanFormattedResume,
    skills: combinedSkills,
    aiProvider: "gemini",
  });
}
