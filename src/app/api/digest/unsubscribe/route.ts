import { NextRequest, NextResponse } from "next/server";
import { verifyDigestUnsubscribeToken } from "@/lib/digest-unsubscribe";
import { unsubscribeUserFromDigest } from "@/services/digest.service";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderHtmlPage(title: string, message: string, okStatus: number) {
  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;color:#0f172a;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;">
    <main style="max-width:440px;width:100%;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;text-align:center;">
      <h1 style="font-size:20px;margin:0 0 12px 0;">${escapeHtml(title)}</h1>
      <p style="font-size:14px;color:#475569;line-height:1.5;margin:0;">${escapeHtml(message)}</p>
    </main>
  </body>
</html>`;
  return new NextResponse(html, {
    status: okStatus,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

async function handleUnsubscribe(request: NextRequest, isPost: boolean) {
  const token = request.nextUrl.searchParams.get("token") || "";
  const verified = verifyDigestUnsubscribeToken(token);
  if (!verified.valid || !verified.userId) {
    if (isPost) {
      return NextResponse.json(
        { ok: false, error: verified.reason || "Invalid unsubscribe token" },
        { status: 400 }
      );
    }
    return renderHtmlPage(
      "Unsubscribe Link Invalid or Expired",
      "We could not verify your unsubscribe link. Please sign in to Settings to manage your email digest preferences.",
      400
    );
  }

  const res = await unsubscribeUserFromDigest(verified.userId);
  if (!res.ok) {
    if (isPost) {
      return NextResponse.json(
        { ok: false, error: "Failed to update digest preferences" },
        { status: 500 }
      );
    }
    return renderHtmlPage(
      "Unable to Unsubscribe",
      "An unexpected error occurred updating your digest preferences. Please try again shortly.",
      500
    );
  }

  if (isPost) {
    return NextResponse.json({ ok: true, unsubscribed: true }, { status: 200 });
  }

  return renderHtmlPage(
    "You have been unsubscribed",
    "You will no longer receive automated JobPilot job digest emails. You can re-enable them anytime from Dashboard Settings.",
    200
  );
}

/** Handles browser link clicks for one-click digest email unsubscribe. */
export async function GET(request: NextRequest) {
  return await handleUnsubscribe(request, false);
}

/** Handles RFC 8058 mail-client POST one-click unsubscribe requests. */
export async function POST(request: NextRequest) {
  return await handleUnsubscribe(request, true);
}
