import "server-only";
import { cache } from "react";
import { auth } from "@/services/auth/auth";
import { isAdmin } from "@/services/auth/admin";
import { headers } from "next/headers";
import { connection } from "next/server";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";

const TRANSIENT_CODES = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "EPIPE",
  "57P01",
  "57P02",
  "57P03",
  "08006",
  "08003",
  "08000",
]);

const TRANSIENT_MESSAGES = [
  "connection terminated unexpectedly",
  "client has encountered a connection error",
];

function isTransientConnectionError(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current && typeof current === "object"; depth++) {
    const errObj = current as { code?: unknown; message?: unknown; cause?: unknown };
    if (typeof errObj.code === "string" && TRANSIENT_CODES.has(errObj.code)) {
      return true;
    }
    if (typeof errObj.message === "string") {
      const lower = errObj.message.toLowerCase();
      if (TRANSIENT_MESSAGES.some((msg) => lower.includes(msg))) {
        return true;
      }
    }
    current = errObj.cause;
  }
  return false;
}

async function getSessionWithTransientRetry(
  options: Parameters<typeof auth.api.getSession>[0]
): Promise<Awaited<ReturnType<typeof auth.api.getSession>>> {
  try {
    return await auth.api.getSession(options);
  } catch (error) {
    if (!isTransientConnectionError(error)) {
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
    return await auth.api.getSession(options);
  }
}

export const requireSession = cache(
  async (): Promise<
    Result<Awaited<ReturnType<typeof auth.api.getSession>>>
  > => {
    try {
      await connection();
      const session = await getSessionWithTransientRetry({
        headers: await headers(),
      });
      if (!session) {
        return err(new AppError("UNAUTHORIZED", "No active session found"));
      }
      if ((session.user as { banned?: boolean | null }).banned) {
        return err(new AppError("FORBIDDEN", "Account has been suspended"));
      }
      return ok(session);
    } catch (error) {
      return err(
        new AppError("UNAUTHORIZED", "Failed to retrieve session", error)
      );
    }
  }
);

export const requireAdmin = cache(
  async (): Promise<
    Result<NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>>
  > => {
    try {
      await connection();
      const session = await getSessionWithTransientRetry({
        headers: await headers(),
        query: { disableCookieCache: true },
      });
      if (!session) {
        return err(new AppError("UNAUTHORIZED", "No active session found"));
      }
      if ((session.user as { banned?: boolean | null }).banned) {
        return err(new AppError("FORBIDDEN", "Account has been suspended"));
      }
      if (!isAdmin(session.user)) {
        return err(
          new AppError("FORBIDDEN", "Administrator privileges required")
        );
      }
      return ok(session);
    } catch (error) {
      return err(
        new AppError("UNAUTHORIZED", "Failed to verify admin session", error)
      );
    }
  }
);
