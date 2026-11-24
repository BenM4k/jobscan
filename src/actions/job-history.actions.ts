"use server";

import { z } from "zod";
import { requireSession } from "@/lib/auth-guard";
import {
  getTailoredDocumentVersions,
  type DocumentVersionItem,
} from "@/services/job-history.service";

const documentVersionsSchema = z.object({
  pipelineEntryId: z.string().uuid("Invalid pipeline entry ID"),
  type: z.enum(["resume", "cover_letter"]),
});

/** Loads saved versions for a user's tailored resume or cover letter. */
export async function getDocumentVersionsAction(input: {
  pipelineEntryId: string;
  type: "resume" | "cover_letter";
}): Promise<{
  success: boolean;
  versions?: DocumentVersionItem[];
  error?: string;
}> {
  const session = await requireSession();
  if (!session.ok || !session.value) {
    return {
      success: false,
      error: session.ok ? "Unauthorized" : session.error.message,
    };
  }

  const parsed = documentVersionsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Invalid parameters",
    };
  }

  const res = await getTailoredDocumentVersions(
    parsed.data.pipelineEntryId,
    session.value.user.id,
    parsed.data.type
  );
  if (!res.ok) {
    return { success: false, error: res.error.message };
  }

  return { success: true, versions: res.value };
}
