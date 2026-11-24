import "server-only";

import * as pipelineDal from "@/dal/pipeline.dal";
import * as tailoringDal from "@/dal/tailoring.dal";
import { ok, err, type Result } from "@/lib/result";
import { AppError } from "@/lib/errors";

export interface DocumentVersionItem {
  id: string;
  content: string;
  createdAt: Date;
}

export interface PipelineTimelineItem {
  id: string;
  status: string;
  changedAt: Date;
}

/** Loads status-change history for a user-owned pipeline entry. */
export async function getJobPipelineTimeline(
  pipelineEntryId: string,
  userId: string
): Promise<Result<PipelineTimelineItem[], AppError>> {
  const entryRes = await pipelineDal.getPipelineEntryById(pipelineEntryId, userId);
  if (!entryRes.ok) return err(entryRes.error);

  const historyRes = await pipelineDal.getPipelineStatusHistory(pipelineEntryId);
  if (!historyRes.ok) return err(historyRes.error);

  return ok(
    historyRes.value.map((item) => ({
      id: item.id,
      status: item.status,
      changedAt: item.changedAt,
    }))
  );
}

/** Loads saved version history for a tailored resume or cover letter owned by the user. */
export async function getTailoredDocumentVersions(
  pipelineEntryId: string,
  userId: string,
  type: "resume" | "cover_letter"
): Promise<Result<DocumentVersionItem[], AppError>> {
  const entryRes = await pipelineDal.getPipelineEntryById(pipelineEntryId, userId);
  if (!entryRes.ok) return err(entryRes.error);

  if (type === "resume") {
    const docRes = await tailoringDal.getTailoredResume(pipelineEntryId);
    if (!docRes.ok) return err(docRes.error);
    if (!docRes.value) return ok([]);

    const versionsRes = await tailoringDal.getTailoredResumeVersions(docRes.value.id);
    if (!versionsRes.ok) return err(versionsRes.error);
    return ok(
      versionsRes.value.map((v) => ({
        id: v.id,
        content: v.content,
        createdAt: v.createdAt,
      }))
    );
  }

  const docRes = await tailoringDal.getTailoredCoverLetter(pipelineEntryId);
  if (!docRes.ok) return err(docRes.error);
  if (!docRes.value) return ok([]);

  const versionsRes = await tailoringDal.getCoverLetterVersions(docRes.value.id);
  if (!versionsRes.ok) return err(versionsRes.error);
  return ok(
    versionsRes.value.map((v) => ({
      id: v.id,
      content: v.content,
      createdAt: v.createdAt,
    }))
  );
}
