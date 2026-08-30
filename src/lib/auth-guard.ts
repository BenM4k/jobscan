import "server-only";
import { cache } from "react";
import { auth } from "@/services/auth/auth";
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
      return ok(session);
    } catch (error) {
      return err(
        new AppError("UNAUTHORIZED", "Failed to retrieve session", error)
      );
    }
  }
);
