import "server-only";

import { db } from "@/services/db";
import { interviewQuestionSet } from "@/services/db/schema";
import { eq, desc } from "drizzle-orm";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";

export interface InterviewQuestionItem {
  question: string;
  category: "behavioral" | "technical" | "situational" | "role_specific";
  context: string;
  suggestedTalkingPoints: string[];
}

export async function createInterviewQuestionSet(
  pipelineEntryId: string,
  questions: InterviewQuestionItem[]
): Promise<Result<{ id: string; pipelineEntryId: string; questions: unknown }, AppError>> {
  try {
    const [row] = await db
      .insert(interviewQuestionSet)
      .values({
        pipelineEntryId,
        questions,
      })
      .returning();

    return ok(row);
  } catch (error) {
    console.error("[Interview DAL] Failed to save questions:", error);
    return err(new AppError("DB_ERROR", "Failed to save interview questions", error));
  }
}

export async function getInterviewQuestionSetByEntryId(
  pipelineEntryId: string
): Promise<Result<{ id: string; questions: unknown } | null, AppError>> {
  try {
    const [row] = await db
      .select()
      .from(interviewQuestionSet)
      .where(eq(interviewQuestionSet.pipelineEntryId, pipelineEntryId))
      .orderBy(desc(interviewQuestionSet.createdAt))
      .limit(1);

    return ok(row || null);
  } catch (error) {
    console.error("[Interview DAL] Failed to fetch questions:", error);
    return err(new AppError("DB_ERROR", "Failed to fetch interview questions", error));
  }
}
