import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-guard";
import { getUserCreditBalance } from "@/services/billing/billing.service";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

/** Returns the authenticated user's live credit balance without caching. */
export async function GET() {
  const sessionResult = await requireSession();
  if (!sessionResult.ok || !sessionResult.value) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  const balanceRes = await getUserCreditBalance(sessionResult.value.user.id);
  if (!balanceRes.ok) {
    return NextResponse.json(
      { ok: false, error: balanceRes.error.message },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }

  return NextResponse.json(
    { ok: true, value: { balance: balanceRes.value } },
    { headers: NO_STORE_HEADERS }
  );
}
