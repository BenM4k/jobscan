import "server-only";

import * as adminDal from "@/dal/admin.dal";
import { grantCredits } from "@/services/billing/billing.service";
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

  return ok({ targetUserId, banned });
}

/**
 * Grant manual credits to a user from the admin console.
 */
export async function grantCreditsToUser(
  _adminUserId: string,
  targetUserId: string,
  amount: number
): Promise<Result<{ balanceAfter: number; amount: number }, AppError>> {
  if (!Number.isInteger(amount) || amount <= 0 || amount > 10000) {
    return err(
      new AppError(
        "VALIDATION_ERROR",
        "Credit grant amount must be an integer between 1 and 10,000"
      )
    );
  }

  const grantRes = await grantCredits(targetUserId, amount, "refund", null);
  if (!grantRes.ok) {
    return err(grantRes.error);
  }

  return ok({ balanceAfter: grantRes.value.balanceAfter, amount });
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
