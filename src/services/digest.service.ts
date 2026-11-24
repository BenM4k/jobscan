import "server-only";

import { Resend } from "resend";
import * as growthDal from "@/dal/growth.dal";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";
import { sanitizeExternalUrl } from "@/lib/safe-url";
import { createDigestUnsubscribeToken } from "@/lib/digest-unsubscribe";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export interface DispatchDigestResult {
  sent: boolean;
  logId?: string;
  jobCount: number;
  reason?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Builds sanitized HTML email markup for a user's personalized digest. */
export function buildDigestHtml(
  userName: string,
  jobs: growthDal.DigestJobSummary[],
  appUrl: string,
  options?: { unsubscribeUrl?: string | null }
): string {
  const safeBaseUrl = (
    sanitizeExternalUrl(appUrl) || "http://localhost:3000"
  ).replace(/\/+$/, "");
  const escapedBaseUrl = escapeHtml(safeBaseUrl);
  const escapedUserName = escapeHtml(userName);
  const safeUnsubUrl = options?.unsubscribeUrl
    ? sanitizeExternalUrl(options.unsubscribeUrl)
    : null;

  const jobItemsHtml = jobs
    .map((j) => {
      const safeJobUrl =
        sanitizeExternalUrl(j.url) ||
        `${safeBaseUrl}/dashboard/jobs/${encodeURIComponent(j.id)}`;
      const matchBadge =
        typeof j.matchPercent === "number"
          ? `<span style="display: inline-block; font-size: 12px; font-weight: 600; background: #dbeafe; color: #1d4ed8; padding: 2px 8px; border-radius: 4px; margin-left: 6px;">${j.matchPercent}% match</span>`
          : "";

      return `
    <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 12px; background: #ffffff;">
      <h3 style="margin: 0 0 6px 0; font-size: 16px; color: #0f172a;">
        <a href="${escapeHtml(safeJobUrl)}" style="color: #2563eb; text-decoration: none;">
          ${escapeHtml(j.title)}
        </a>
      </h3>
      <p style="margin: 0 0 6px 0; font-size: 14px; color: #475569;">
        <strong>${escapeHtml(j.company)}</strong> ${j.location ? `• ${escapeHtml(j.location)}` : ""}
      </p>
      <span style="display: inline-block; font-size: 12px; background: #f1f5f9; color: #64748b; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">
        ${escapeHtml(j.source)}
      </span>${matchBadge}
    </div>
  `;
    })
    .join("");

  const unsubscribeFooter = safeUnsubUrl
    ? `<p style="margin-top: 16px; font-size: 12px; color: #64748b;">
         Prefer fewer emails? <a href="${escapeHtml(safeUnsubUrl)}" style="color: #475569; text-decoration: underline;">Unsubscribe with one click</a>.
       </p>`
    : "";

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background: #f8fafc;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #0f172a; font-size: 24px; margin-bottom: 8px;">JobPilot Opportunity Digest</h1>
        <p style="color: #64748b; margin: 0; font-size: 14px;">Here are the latest curated job opportunities matching your profile, ${escapedUserName}.</p>
      </div>
      <div style="margin-bottom: 24px;">
        ${jobItemsHtml}
      </div>
      <div style="text-align: center; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
        <a href="${escapedBaseUrl}/dashboard" style="background: #0f172a; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 14px; display: inline-block;">
          View All Opportunities
        </a>
        ${unsubscribeFooter}
      </div>
    </div>
  `;
}

/** Disables digest email delivery for a user. */
export async function unsubscribeUserFromDigest(
  userId: string
): Promise<Result<void, AppError>> {
  return await growthDal.disableDigestEmailsForUser(userId);
}

export async function dispatchUserDigestEmail(
  userId: string,
  frequency?: "daily" | "weekly"
): Promise<Result<DispatchDigestResult, AppError>> {
  try {
    const userResult = await growthDal.getUserForDigest(userId);
    if (!userResult.ok) return userResult;
    const user = userResult.value;

    if (!user) {
      return ok({ sent: false, jobCount: 0, reason: `User ${userId} not found` });
    }

    if (!user.digestEmailEnabled) {
      return ok({ sent: false, jobCount: 0, reason: "Digest emails disabled by user" });
    }

    if (frequency && user.frequency !== frequency) {
      return ok({
        sent: false,
        jobCount: 0,
        reason: `User frequency is '${user.frequency}', skipping for '${frequency}' run`,
      });
    }

    const priorRes = await growthDal.getPreviouslyEmailedJobIds(userId);
    const excludedIds = priorRes.ok ? priorRes.value : [];

    const jobsResult = await growthDal.getPersonalizedDigestJobs(userId, 5, excludedIds);
    if (!jobsResult.ok) return jobsResult;
    const jobs = jobsResult.value;

    if (jobs.length === 0) {
      return ok({ sent: false, jobCount: 0, reason: "No unseen fresh jobs available for digest" });
    }

    const appUrl = (
      sanitizeExternalUrl(process.env.BETTER_AUTH_URL) || "http://localhost:3000"
    ).replace(/\/+$/, "");

    let unsubscribeUrl: string | null = null;
    try {
      const token = createDigestUnsubscribeToken(user.id);
      unsubscribeUrl = `${appUrl}/api/digest/unsubscribe?token=${encodeURIComponent(token)}`;
    } catch {
      // Signing secret unset in local dev — omit one-click link cleanly.
    }

    const fromEmail =
      process.env.RESEND_FROM_EMAIL ||
      "JobPilot Digest <onboarding@bennymak.best>";

    if (resend) {
      const { error } = await resend.emails.send({
        from: fromEmail,
        to: user.email,
        subject: `JobPilot: ${jobs.length} new jobs matched for you`,
        html: buildDigestHtml(user.name, jobs, appUrl, { unsubscribeUrl }),
        ...(unsubscribeUrl
          ? {
              headers: {
                "List-Unsubscribe": `<${unsubscribeUrl}>`,
                "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
              },
            }
          : {}),
      });

      if (error) {
        console.error(`[DigestService] Resend returned error sending to user ${user.id}:`, error);
        return err(
          new AppError(
            "EXTERNAL_API_ERROR",
            `Resend email sending failed: ${error.message}`,
            error
          )
        );
      }
    } else {
      console.log(
        `[DigestService] Mock email sent to user ${user.id} with ${jobs.length} personalized jobs (RESEND_API_KEY not configured)`
      );
    }

    const jobIds = jobs.map((j) => j.id);
    const logResult = await growthDal.recordDigestEmailLog(userId, jobIds);
    const logId = logResult.ok ? logResult.value.id : undefined;

    return ok({ sent: true, logId, jobCount: jobs.length });
  } catch (error) {
    console.error(`Failed to dispatch digest email to ${userId}:`, error);
    return err(
      new AppError("EXTERNAL_API_ERROR", "Failed to send digest email", error)
    );
  }
}
