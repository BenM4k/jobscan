"use server";

import { requireSession } from "@/lib/auth-guard";
import * as resumeDal from "@/dal/resume.dal";
import { revalidatePath } from "next/cache";
import {
  createMasterResumeSchema,
  updateMasterResumeSchema,
  promoteTailoredResumeSchema,
  revertActiveResumeSchema,
  deleteMasterResumeSchema,
} from "./resume.schema";

export async function getMasterResumesAction() {
  const session = await requireSession();
  if (!session.ok || !session.value) {
    return { success: false, error: session.ok ? "Unauthorized" : session.error.message };
  }

  const res = await resumeDal.getMasterResumes(session.value.user.id);
  if (!res.ok) {
    return { success: false, error: res.error.message };
  }

  return { success: true, data: res.value };
}

export async function setActiveResumeAction(resumeId: string) {
  const session = await requireSession();
  if (!session.ok || !session.value) {
    return { success: false, error: session.ok ? "Unauthorized" : session.error.message };
  }

  const res = await resumeDal.setActiveMasterResume(resumeId, session.value.user.id);
  if (!res.ok) {
    return { success: false, error: res.error.message };
  }

  revalidatePath("/dashboard/resumes");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  return { success: true, data: true };
}

export async function createMasterResumeAction(data: {
  label: string;
  content: string;
  language?: "en" | "fr";
  fileUrl?: string;
  skills?: string[];
}): Promise<
  | { success: true; data: resumeDal.MasterResumeSelect }
  | { success: false; error: string; data?: never }
> {
  const session = await requireSession();
  if (!session.ok || !session.value) {
    return { success: false, error: session.ok ? "Unauthorized" : session.error.message };
  }

  const parsed = createMasterResumeSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const userId = session.value.user.id;
  const res = await resumeDal.createMasterResume(
    {
      userId,
      label: parsed.data.label,
      content: parsed.data.content,
      language: parsed.data.language,
      fileUrl: parsed.data.fileUrl || null,
      isActive: true,
      version: 1,
      source: "uploaded",
    },
    parsed.data.skills
  );

  if (!res.ok) {
    return { success: false, error: res.error.message };
  }

  revalidatePath("/dashboard/resumes");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  return { success: true, data: res.value };
}

export async function updateMasterResumeAction(data: {
  id: string;
  label?: string;
  content?: string;
  language?: "en" | "fr";
  skills?: string[];
}) {
  const session = await requireSession();
  if (!session.ok || !session.value) {
    return { success: false, error: session.ok ? "Unauthorized" : session.error.message };
  }

  const parsed = updateMasterResumeSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const userId = session.value.user.id;
  const res = await resumeDal.updateMasterResume(
    parsed.data.id,
    userId,
    {
      ...(parsed.data.label ? { label: parsed.data.label } : {}),
      ...(parsed.data.content ? { content: parsed.data.content } : {}),
      ...(parsed.data.language ? { language: parsed.data.language } : {}),
    },
    parsed.data.skills
  );

  if (!res.ok) {
    return { success: false, error: res.error.message };
  }

  revalidatePath("/dashboard/resumes");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  return { success: true, data: res.value };
}

export async function promoteTailoredResumeAction(
  tailoredResumeId: string,
  label: string
): Promise<
  | { success: true; data: resumeDal.MasterResumeSelect; previousActiveId?: string | null }
  | { success: false; error: string; data?: never; previousActiveId?: never }
> {
  const session = await requireSession();
  if (!session.ok || !session.value) {
    return { success: false, error: session.ok ? "Unauthorized" : session.error.message };
  }

  const parsed = promoteTailoredResumeSchema.safeParse({ tailoredResumeId, label });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid arguments" };
  }

  const res = await resumeDal.promoteTailoredResumeToMaster(
    parsed.data.tailoredResumeId,
    session.value.user.id,
    parsed.data.label
  );

  if (!res.ok) {
    return { success: false, error: res.error.message };
  }

  revalidatePath("/dashboard/resumes");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");

  return {
    success: true,
    data: res.value.newMasterResume,
    previousActiveId: res.value.previousActiveId,
  };
}

export async function revertActiveResumeAction(previousActiveId: string) {
  const session = await requireSession();
  if (!session.ok || !session.value) {
    return { success: false, error: session.ok ? "Unauthorized" : session.error.message };
  }

  const parsed = revertActiveResumeSchema.safeParse({ previousActiveId });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid resume ID" };
  }

  const res = await resumeDal.revertActiveResume(
    session.value.user.id,
    parsed.data.previousActiveId
  );

  if (!res.ok) {
    return { success: false, error: res.error.message };
  }

  revalidatePath("/dashboard/resumes");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  return { success: true, data: true };
}

export async function deleteMasterResumeAction(resumeId: string): Promise<
  | { success: true; data: { deletedId: string; fallbackActiveId: string | null } }
  | { success: false; error: string; data?: never }
> {
  const session = await requireSession();
  if (!session.ok || !session.value) {
    return { success: false, error: session.ok ? "Unauthorized" : session.error.message };
  }

  const parsed = deleteMasterResumeSchema.safeParse({ resumeId });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid resume ID" };
  }

  const res = await resumeDal.deleteMasterResume(parsed.data.resumeId, session.value.user.id);
  if (!res.ok) {
    return { success: false, error: res.error.message };
  }

  revalidatePath("/dashboard/resumes");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  return { success: true, data: res.value };
}
