import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/services/db";
import * as schema from "@/services/db/schema";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  advanced: {
    database: { generateId: "uuid" },
  },

  emailAndPassword: {
    enabled: true,
    async sendResetPassword({
      user,
      url,
    }: {
      user: { email: string };
      url: string;
    }) {
      const fromEmail =
        process.env.RESEND_FROM_EMAIL ||
        "JobPilot Auth <onboarding@bennymak.best>";
      await resend.emails.send({
        from: fromEmail,
        to: user.email,
        subject: "Reset your JobPilot password",
        html: `<p>Click the link below to reset your password:</p><p><a href="${url}">${url}</a></p>`,
      });
    },

    async sendVerificationEmail({
      user,
      url,
    }: {
      user: { email: string };
      url: string;
    }) {
      const fromEmail =
        process.env.RESEND_FROM_EMAIL ||
        "JobPilot Auth <onboarding@bennymak.best>";
      await resend.emails.send({
        from: fromEmail,
        to: user.email,
        subject: "Verify your JobPilot email",
        html: `<p>Click the link below to verify your email address:</p><p><a href="${url}">${url}</a></p>`,
      });
    },
  },
  secret:
    process.env.BETTER_AUTH_SECRET ||
    "fallback-secret-for-development-min-32-chars",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
});
