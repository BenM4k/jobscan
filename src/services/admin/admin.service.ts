import "server-only";

import * as adminDal from "@/dal/admin.dal";
import * as billingDal from "@/dal/billing.dal";
import { grantCredits } from "@/services/billing/billing.service";
import { setUserFeatureFlagOverride, FEATURE_FLAGS } from "@/services/flags";
import { upsertUserPreferences } from "@/dal/growth.dal";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";

export type {
  AdminOverviewStats,
  AdminUserListItem,
  AdminUsersFilter,
} from "@/dal/admin.dal";

/**
 * Fetch high-level admin metrics for the overview dashboard.
 */
export async function getAdminOverview(): Promise<
  Result<adminDal.AdminOverviewStats, AppError>
> {
  return adminDal.getAdminOverviewStats();
}

/**
 * Fetch paginated users list with search and filters.
 */
export async function getAdminUsers(
  filter: adminDal.AdminUsersFilter
): Promise<
  Result<
    {
      users: adminDal.AdminUserListItem[];
      totalCount: number;
      page: number;
      totalPages: number;
    },
    AppError
  >
> {
  return adminDal.getAdminUsersList(filter);
}

/**
 * Retrieve user details including ledger, sessions, and subscriptions.
 */
export async function getAdminUserDetail(
  userId: string
) {
  return adminDal.getAdminUserDetails(userId);
}

/**
 * Update a user's role (e.g., 'user' <-> 'admin').
 * An admin cannot remove their own admin privileges to avoid lockout.
 */
export async function changeUserRole(
  adminUserId: string,
  targetUserId: string,
  newRole: "user" | "admin"
): Promise<Result<{ targetUserId: string; newRole: string }, AppError>> {
  if (adminUserId === targetUserId && newRole !== "admin") {
    return err(
      new AppError("VALIDATION_ERROR", "You cannot demote yourself from administrator")
    );
  }

  const updateRes = await adminDal.updateUserRoleInDb(targetUserId, newRole);
  if (!updateRes.ok) {
    return err(updateRes.error);
  }

  await recordAdminAuditEvent({
    adminUserId,
    targetUserId,
    action: "role_change",
    metadata: { newRole },
  });

  return ok({ targetUserId, newRole });
}

/**
 * Ban or unban a user.
 * An admin cannot ban themselves.
 */
export async function changeUserBanStatus(
  adminUserId: string,
  targetUserId: string,
  banned: boolean,
  reason?: string | null,
  expires?: Date | null
): Promise<Result<{ targetUserId: string; banned: boolean }, AppError>> {
  if (adminUserId === targetUserId && banned) {
    return err(
      new AppError("VALIDATION_ERROR", "You cannot ban your own administrator account")
    );
  }

  const updateRes = await adminDal.updateUserBanInDb(
    targetUserId,
    banned,
    reason,
    expires
  );

  if (!updateRes.ok) {
    return err(updateRes.error);
  }

  await recordAdminAuditEvent({
    adminUserId,
    targetUserId,
    action: banned ? "ban_user" : "unban_user",
    reason: reason ?? null,
    metadata: expires ? { expires: expires.toISOString() } : null,
  });

  return ok({ targetUserId, banned });
}

/**
 * Grant manual credits to a user from the admin console.
 */
export async function grantCreditsToUser(
  adminUserId: string,
  targetUserId: string,
  amount: number,
  reason?: string
): Promise<Result<{ balanceAfter: number; amount: number }, AppError>> {
  if (!Number.isInteger(amount) || amount <= 0 || amount > 10000) {
    return err(
      new AppError(
        "VALIDATION_ERROR",
        "Credit grant amount must be an integer between 1 and 10,000"
      )
    );
  }

  const grantRes = await grantCredits(targetUserId, amount, "admin_grant", null);
  if (!grantRes.ok) {
    return err(grantRes.error);
  }

  await recordAdminAuditEvent({
    adminUserId,
    targetUserId,
    action: "admin_grant",
    reason: reason ?? null,
    metadata: { amount, balanceAfter: grantRes.value.balanceAfter },
  });

  console.log(
    `[Admin] User ${adminUserId} granted ${amount} credits to user ${targetUserId}. Reason: ${reason || "none"}`
  );

  return ok({ balanceAfter: grantRes.value.balanceAfter, amount });
}

/**
 * Gift a Pro subscription to a user from the admin console.
 */
export async function giftSubscriptionToUser(
  adminUserId: string,
  targetUserId: string,
  durationDays: number = 30,
  reason?: string,
  idempotencyKey?: string
): Promise<
  Result<{ targetUserId: string; newPeriodEnd: Date; planName: string }, AppError>
> {
  if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 730) {
    return err(
      new AppError(
        "VALIDATION_ERROR",
        "Subscription gift duration must be between 1 and 730 days"
      )
    );
  }

  // Find Pro subscription plan
  const planRes = await billingDal.getSubscriptionPlanByKey("pro");
  if (!planRes.ok || !planRes.value) {
    return err(new AppError("NOT_FOUND", "Pro subscription plan not found"));
  }

  const plan = planRes.value;

  const giftRes = await billingDal.giftSubscriptionAtomic({
    userId: targetUserId,
    planId: plan.id,
    durationDays,
    adminUserId,
    reason,
    idempotencyKey,
  });

  if (!giftRes.ok) {
    return err(giftRes.error);
  }

  // 1. Grant hybrid scoring feature flag override
  const flagRes = await setUserFeatureFlagOverride(
    targetUserId,
    FEATURE_FLAGS.HYBRID_SCORING,
    true
  );
  if (!flagRes.success) {
    console.error(
      `[Admin] Failed to set hybrid scoring flag for ${targetUserId}:`,
      flagRes.error
    );
    return err(
      new AppError(
        "INTERNAL_ERROR",
        `Subscription granted but failed to activate Pro features: ${flagRes.error || "Unknown error"}`
      )
    );
  }

  // 2. Grant daily digest email frequency
  const prefRes = await upsertUserPreferences(targetUserId, {
    digestEmailFrequency: "daily",
  });
  if (!prefRes.ok) {
    console.error(
      `[Admin] Failed to update user preferences for ${targetUserId}:`,
      prefRes.error
    );
    return err(
      new AppError(
        "INTERNAL_ERROR",
        `Subscription granted but failed to update preferences: ${prefRes.error.message}`
      )
    );
  }

  await recordAdminAuditEvent({
    adminUserId,
    targetUserId,
    action: "gift_subscription",
    reason: reason ?? null,
    metadata: { durationDays, planName: plan.name },
  });

  console.log(
    `[Admin] Admin ${adminUserId} gifted a ${durationDays}-day ${plan.name} subscription to user ${targetUserId}. Reason: ${reason || "none"}`
  );

  return ok({
    targetUserId,
    newPeriodEnd: giftRes.value.newPeriodEnd,
    planName: plan.name,
  });
}

/** Records an administrative audit event (best-effort; never throws across boundary). */
export async function recordAdminAuditEvent(input: {
  adminUserId: string;
  targetUserId?: string | null;
  action: string;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    await adminDal.insertAdminAuditLog(input);
  } catch (err) {
    console.warn("[Admin Service] Audit log insert failed:", err);
  }
}

/** Queries paginated administrative audit logs for the admin console. */
export async function getAdminAuditLogPage(filter: {
  page?: number;
  limit?: number;
  action?: string;
}) {
  return adminDal.getAdminAuditLogs(filter);
}

/**
 * Query credit audit ledger.
 */
export async function getAdminLedger(filter: {
  page?: number;
  limit?: number;
  userId?: string;
}) {
  return adminDal.getAdminCreditLedger(filter);
}

/**
 * Query AI call telemetry and logs.
 */
export async function getAdminAiTelemetry(filter: {
  page?: number;
  limit?: number;
  feature?: string;
  userId?: string;
}) {
  return adminDal.getAdminAiLogs(filter);
}

/**
 * Job sources status and circuit breaker summary.
 */
export async function getAdminSourcesStatus() {
  return adminDal.getAdminJobSourcesSummary();
}
