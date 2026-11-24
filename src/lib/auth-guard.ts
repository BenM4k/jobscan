import "server-only";
import { cache } from "react";
import { auth } from "@/services/auth/auth";
import { isAdmin } from "@/services/auth/admin";
import { headers } from "next/headers";
import { connection } from "next/server";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";

export const requireSession = cache(
  async (): Promise<
    Result<Awaited<ReturnType<typeof auth.api.getSession>>>
  > => {
    try {
      await connection();
      const session = await auth.api.getSession({ headers: await headers() });
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
    const sessionResult = await requireSession();
    if (!sessionResult.ok) {
      return err(sessionResult.error);
    }
    if (!sessionResult.value) {
      return err(new AppError("UNAUTHORIZED", "No active session found"));
    }
    if (!isAdmin(sessionResult.value.user)) {
      return err(new AppError("FORBIDDEN", "Administrator privileges required"));
    }
    return ok(sessionResult.value);
  }
);
