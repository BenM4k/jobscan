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

function renderConfirmPage(token: string) {
  const safeToken = escapeHtml(token);
  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Confirm Unsubscribe</title>
  </head>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;color:#0f172a;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;">
    <main style="max-width:440px;width:100%;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;text-align:center;">
      <h1 style="font-size:20px;margin:0 0 12px 0;">Unsubscribe from Job Digest</h1>
      <p style="font-size:14px;color:#475569;line-height:1.5;margin:0 0 20px 0;">Click below to confirm unsubscribing from automated JobPilot job digest emails.</p>
      <form method="POST" action="/api/digest/unsubscribe">
        <input type="hidden" name="token" value="${safeToken}" />
        <input type="hidden" name="format" value="html" />
        <button type="submit" style="background:#0f172a;color:#ffffff;border:0;border-radius:10px;padding:10px 18px;font-size:14px;font-weight:600;cursor:pointer;">Confirm Unsubscribe</button>
      </form>
    </main>
  </body>
</html>`;
  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

/** Handles browser link clicks by verifying the token and rendering confirmation without mutating state. */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") || "";
  const verified = verifyDigestUnsubscribeToken(token);
  if (!verified.valid || !verified.userId) {
    return renderHtmlPage(
      "Unsubscribe Link Invalid or Expired",
      "We could not verify your unsubscribe link. Please sign in to Settings to manage your email digest preferences.",
      400
    );
  }

  return renderConfirmPage(token);
}

/** Handles both confirmation-form POSTs and RFC 8058 mail-client one-click POST requests. */
export async function POST(request: NextRequest) {
  const queryToken = request.nextUrl.searchParams.get("token");
  const form = await request.formData().catch(() => null);
  const token = queryToken || (form ? String(form.get("token") || "") : "");
  const wantsHtml = form ? String(form.get("format") || "") === "html" : false;

  const verified = verifyDigestUnsubscribeToken(token);
  if (!verified.valid || !verified.userId) {
    if (wantsHtml) {
      return renderHtmlPage(
        "Unsubscribe Link Invalid or Expired",
        "We could not verify your unsubscribe link. Please sign in to Settings to manage your email digest preferences.",
        400
      );
    }
    return NextResponse.json(
      { ok: false, error: verified.reason || "Invalid unsubscribe token" },
      { status: 400 }
    );
  }

  const res = await unsubscribeUserFromDigest(verified.userId);
  if (!res.ok) {
    if (wantsHtml) {
      return renderHtmlPage(
        "Unable to Unsubscribe",
        "An unexpected error occurred updating your digest preferences. Please try again shortly.",
        500
      );
    }
    return NextResponse.json(
      { ok: false, error: "Failed to update digest preferences" },
      { status: 500 }
    );
  }

  if (wantsHtml) {
    return renderHtmlPage(
      "You have been unsubscribed",
      "You will no longer receive automated JobPilot job digest emails. You can re-enable them anytime from Dashboard Settings.",
      200
    );
  }

  return NextResponse.json({ ok: true, unsubscribed: true }, { status: 200 });
}
