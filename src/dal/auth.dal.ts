import "server-only";
import { db } from "@/services/db";
import {
  session as sessionTable,
  passkey as passkeyTable,
} from "@/services/db/schema/auth";
import { eq, and, gt, desc } from "drizzle-orm";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";

export interface UserSessionRecord {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface UserPasskeyRecord {
  id: string;
  name: string | null;
  createdAt: Date | null;
  deviceType: string | null;
  aaguid: string | null;
}

/**
 * Fetch all active, non-expired sessions for a given user from the database.
 */
export async function getActiveSessionsForUser(
  userId: string
): Promise<Result<UserSessionRecord[]>> {
  try {
    const now = new Date();
    const rows = await db
      .select({
        id: sessionTable.id,
        token: sessionTable.token,
        userId: sessionTable.userId,
        expiresAt: sessionTable.expiresAt,
        createdAt: sessionTable.createdAt,
        updatedAt: sessionTable.updatedAt,
        ipAddress: sessionTable.ipAddress,
        userAgent: sessionTable.userAgent,
      })
      .from(sessionTable)
      .where(
        and(
          eq(sessionTable.userId, userId),
          gt(sessionTable.expiresAt, now)
        )
      )
      .orderBy(desc(sessionTable.createdAt));

    return ok(rows);
  } catch (error) {
    return err(
      new AppError("INTERNAL_ERROR", "Failed to query active sessions", error)
    );
  }
}

/**
 * Fetch registered passkeys for a given user from the database.
 */
export async function getUserPasskeys(
  userId: string
): Promise<Result<UserPasskeyRecord[]>> {
  try {
    const rows = await db
      .select({
        id: passkeyTable.id,
        name: passkeyTable.name,
        createdAt: passkeyTable.createdAt,
        deviceType: passkeyTable.deviceType,
        aaguid: passkeyTable.aaguid,
      })
      .from(passkeyTable)
      .where(eq(passkeyTable.userId, userId))
      .orderBy(desc(passkeyTable.createdAt));

    return ok(rows);
  } catch (error) {
    return err(
      new AppError("INTERNAL_ERROR", "Failed to query user passkeys", error)
    );
  }
}
