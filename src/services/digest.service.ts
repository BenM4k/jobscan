import "server-only";

import { Resend } from "resend";
import * as growthDal from "@/dal/growth.dal";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export interface DispatchDigestResult {
  sent: boolean;
  logId?: string;
  jobCount: number;
  reason?: string;
}

export function buildDigestHtml(
  userName: string,
  jobs: growthDal.DigestJobSummary[],
  appUrl: string
): string {
  const jobItemsHtml = jobs
    .map(
      (j) => `
    <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 12px; background: #ffffff;">
      <h3 style="margin: 0 0 6px 0; font-size: 16px; color: #0f172a;">
        <a href="${j.url || `${appUrl}/dashboard/jobs/${j.id}`}" style="color: #2563eb; text-decoration: none;">
          ${j.title}
        </a>
      </h3>
      <p style="margin: 0 0 6px 0; font-size: 14px; color: #475569;">
        <strong>${j.company}</strong> ${j.location ? `• ${j.location}` : ""}
      </p>
      <span style="display: inline-block; font-size: 12px; background: #f1f5f9; color: #64748b; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">
        ${j.source}
      </span>
    </div>
  `
    )
    .join("");

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background: #f8fafc;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #0f172a; font-size: 24px; margin-bottom: 8px;">JobPilot Opportunity Digest</h1>
        <p style="color: #64748b; margin: 0; font-size: 14px;">Here are the latest curated job opportunities matching your profile, ${userName}.</p>
      </div>
      <div style="margin-bottom: 24px;">
        ${jobItemsHtml}
      </div>
      <div style="text-align: center; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
        <a href="${appUrl}/dashboard" style="background: #0f172a; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 14px; display: inline-block;">
          View All Opportunities
        </a>
      </div>
    </div>
  `;
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
      return ok({
        sent: false,
        jobCount: 0,
        reason: `User ${userId} not found`,
      });
    }

    if (frequency && user.frequency !== frequency) {
      return ok({
        sent: false,
        jobCount: 0,
        reason: `User frequency is '${user.frequency}', skipping for '${frequency}' run`,
      });
    }

    const jobsResult = await growthDal.getRecentDigestJobs(5);
    if (!jobsResult.ok) return jobsResult;
    const jobs = jobsResult.value;

    if (jobs.length === 0) {
      return ok({
        sent: false,
        jobCount: 0,
        reason: "No fresh jobs available for digest",
      });
    }

    const appUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";
    const fromEmail =
      process.env.RESEND_FROM_EMAIL ||
      "JobPilot Digest <onboarding@bennymak.best>";

    if (resend) {
      await resend.emails.send({
        from: fromEmail,
        to: user.email,
        subject: `JobPilot: ${jobs.length} new jobs matched for you`,
        html: buildDigestHtml(user.name, jobs, appUrl),
      });
    } else {
      console.log(
        `[DigestService] Mock email sent to ${user.email} with ${jobs.length} jobs (RESEND_API_KEY not configured)`
      );
    }

    const jobIds = jobs.map((j) => j.id);
    const logResult = await growthDal.recordDigestEmailLog(userId, jobIds);
    const logId = logResult.ok ? logResult.value.id : undefined;

    return ok({
      sent: true,
      logId,
      jobCount: jobs.length,
    });
  } catch (error) {
    console.error(`Failed to dispatch digest email to ${userId}:`, error);
    return err(
      new AppError("EXTERNAL_API_ERROR", "Failed to send digest email", error)
    );

  }
}
