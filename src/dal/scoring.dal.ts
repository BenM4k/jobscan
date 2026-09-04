if (typeof window !== "undefined") {
  throw new Error("This module can only be executed on the server.");
}
import { db } from "@/services/db";
import { score } from "@/services/db/schema";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";
import { eq, desc } from "drizzle-orm";

export type ScoreSelect = typeof score.$inferSelect;
export type ScoreInsert = typeof score.$inferInsert;

export async function getLatestScoreByPipelineEntryId(
  pipelineEntryId: string
): Promise<Result<ScoreSelect | null, AppError>> {
  try {
    const [latest] = await db
      .select()
      .from(score)
      .where(eq(score.pipelineEntryId, pipelineEntryId))
      .orderBy(desc(score.createdAt))
      .limit(1);
    return ok(latest || null);
  } catch (error) {
    return err(
      new AppError(
        "DB_ERROR",
        `Failed to fetch score for pipeline entry ${pipelineEntryId}`,
        error
      )
    );
  }
}

export async function createScore(
  data: ScoreInsert
): Promise<Result<ScoreSelect, AppError>> {
  try {
    const [created] = await db.insert(score).values(data).returning();
    if (!created) {
      return err(new AppError("DB_ERROR", "Failed to persist score snapshot"));
    }
    return ok(created);
  } catch (error) {
    return err(
      new AppError("DB_ERROR", "Failed to insert score record", error)
    );
  }
}

export async function getScoreHistory(
  pipelineEntryId: string
): Promise<Result<ScoreSelect[], AppError>> {
  try {
    const history = await db
      .select()
      .from(score)
      .where(eq(score.pipelineEntryId, pipelineEntryId))
      .orderBy(desc(score.createdAt));
    return ok(history);
  } catch (error) {
    return err(
      new AppError("DB_ERROR", "Failed to fetch score history", error)
    );
  }
}
