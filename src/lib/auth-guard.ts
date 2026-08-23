import "server-only";
import { auth } from "@/services/auth/auth";
import { headers } from "next/headers";
import { connection } from "next/server";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";

export async function requireSession(): Promise<
  Result<Awaited<ReturnType<typeof auth.api.getSession>>>
> {
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
