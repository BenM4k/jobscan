import "server-only";
import * as authDal from "@/dal/auth.dal";
import type { UserPasskeyRecord, UserSessionRecord } from "@/dal/auth.dal";
import type { Result } from "@/lib/result";

export type { UserPasskeyRecord, UserSessionRecord };

/** Retrieves active, non-expired sessions for a user via Auth DAL. */
export async function getUserActiveSessions(
  userId: string
): Promise<Result<UserSessionRecord[]>> {
  return await authDal.getActiveSessionsForUser(userId);
}

/** Retrieves registered passkeys for a user via Auth DAL. */
export async function getUserRegisteredPasskeys(
  userId: string
): Promise<Result<UserPasskeyRecord[]>> {
  return await authDal.getUserPasskeys(userId);
}
