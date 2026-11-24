import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { passkey } from "@better-auth/passkey";
import { admin } from "better-auth/plugins";
import { db } from "@/services/db";
import * as schema from "@/services/db/schema";
import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY?.trim();
if (!resendApiKey) {
  throw new Error("RESEND_API_KEY environment variable is required");
}

const authSecret = process.env.BETTER_AUTH_SECRET?.trim();
if (
  process.env.NODE_ENV === "production" &&
  (!authSecret || authSecret.length < 32)
) {
  throw new Error(
    "BETTER_AUTH_SECRET environment variable (min 32 chars) is required in production"
  );
}

const resend = new Resend(resendApiKey);

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      passkey: schema.passkey,
    },
  }),
  plugins: [
    passkey({
      rpID: process.env.NEXT_PUBLIC_APP_DOMAIN || "localhost",
      rpName: "Jobpilot",
      origin: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    }),
    admin(),
  ],
  session: {
    freshAge: 60 * 15,
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          try {
            const { grantCredits } = await import("@/services/billing/billing.service");
            await grantCredits(user.id, 6, "signup_grant", null);
          } catch (err) {
            console.error("[Auth] Failed to grant signup credits:", err);
          }
        },
      },
    },
  },
  advanced: {
    database: { generateId: "uuid" },
  },
  trustedOrigins: [
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
    ...(process.env.NEXT_PUBLIC_APP_DOMAIN
      ? [`https://${process.env.NEXT_PUBLIC_APP_DOMAIN}`]
      : []),
    ...(process.env.NODE_ENV !== "production"
      ? [
          "http://localhost:3000",
          "http://localhost:3001",
          "http://localhost:3002",
          "http://127.0.0.1:3000",
          "http://127.0.0.1:3001",
          "http://127.0.0.1:3002",
        ]
      : []),
  ],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
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
    authSecret || "dev-only-fallback-secret-do-not-use-in-prod",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
});
