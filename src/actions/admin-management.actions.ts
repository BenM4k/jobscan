"use server";

import { requireSession } from "@/lib/auth-guard";
import { isAdmin } from "@/services/auth/admin";
import {
  changeUserRole,
  changeUserBanStatus,
  grantCreditsToUser,
} from "@/services/admin/admin.service";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const changeRoleSchema = z.object({
  targetUserId: z.string().uuid(),
  role: z.enum(["user", "admin"]),
});

const changeBanSchema = z.object({
  targetUserId: z.string().uuid(),
  banned: z.boolean(),
  reason: z.string().max(255).optional(),
});

const grantCreditsSchema = z.object({
  targetUserId: z.string().uuid(),
  amount: z.number().int().min(1).max(10000),
  reason: z.string().max(255).optional(),
});

export type AdminActionResult<T = undefined> =
  | { ok: true; value: T }
  | { ok: false; error: string };

/**
 * Server action to change a user's role.
 */
export async function changeUserRoleAction(
  targetUserId: string,
  role: "user" | "admin"
): Promise<AdminActionResult<{ targetUserId: string; newRole: string }>> {
  const sessionResult = await requireSession();
  if (!sessionResult.ok || !sessionResult.value) {
    return { ok: false, error: "Unauthorized" };
  }

  const currentUser = sessionResult.value.user;
  if (!isAdmin(currentUser)) {
    return { ok: false, error: "Forbidden: Admin privileges required" };
  }

  const parsed = changeRoleSchema.safeParse({ targetUserId, role });
  if (!parsed.success) {
    return { ok: false, error: "Invalid role or user ID" };
  }

  const res = await changeUserRole(
    currentUser.id,
    parsed.data.targetUserId,
    parsed.data.role
  );

  if (!res.ok) {
    return { ok: false, error: res.error.message };
  }

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/users");
  return { ok: true, value: res.value };
}

/**
 * Server action to ban or unban a user.
 */
export async function changeUserBanAction(
  targetUserId: string,
  banned: boolean,
  reason?: string
): Promise<AdminActionResult<{ targetUserId: string; banned: boolean }>> {
  const sessionResult = await requireSession();
  if (!sessionResult.ok || !sessionResult.value) {
    return { ok: false, error: "Unauthorized" };
  }

  const currentUser = sessionResult.value.user;
  if (!isAdmin(currentUser)) {
    return { ok: false, error: "Forbidden: Admin privileges required" };
  }

  const parsed = changeBanSchema.safeParse({ targetUserId, banned, reason });
  if (!parsed.success) {
    return { ok: false, error: "Invalid ban parameters" };
  }

  const res = await changeUserBanStatus(
    currentUser.id,
    parsed.data.targetUserId,
    parsed.data.banned,
    parsed.data.reason
  );

  if (!res.ok) {
    return { ok: false, error: res.error.message };
  }

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/users");
  return { ok: true, value: res.value };
}

/**
 * Server action to grant credits manually to a user.
 */
export async function adminGrantCreditsAction(
  targetUserId: string,
  amount: number,
  reason?: string
): Promise<AdminActionResult<{ balanceAfter: number; amount: number }>> {
  const sessionResult = await requireSession();
  if (!sessionResult.ok || !sessionResult.value) {
    return { ok: false, error: "Unauthorized" };
  }

  const currentUser = sessionResult.value.user;
  if (!isAdmin(currentUser)) {
    return { ok: false, error: "Forbidden: Admin privileges required" };
  }

  const parsed = grantCreditsSchema.safeParse({ targetUserId, amount, reason });
  if (!parsed.success) {
    return { ok: false, error: "Invalid credit amount (must be 1 - 10,000)" };
  }

  const res = await grantCreditsToUser(
    currentUser.id,
    parsed.data.targetUserId,
    parsed.data.amount
  );

  if (!res.ok) {
    return { ok: false, error: res.error.message };
  }

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/users");
  return { ok: true, value: res.value };
}
