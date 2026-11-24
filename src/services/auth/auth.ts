import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { passkey } from "@better-auth/passkey";
import { admin } from "better-auth/plugins";
import { db } from "@/services/db";
import * as schema from "@/services/db/schema";
import { Resend } from "resend";
import { resolvePasskeyAndAuthConfig } from "./passkey-config";

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
const authUrls = resolvePasskeyAndAuthConfig(process.env);

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
      rpID: authUrls.rpID,
      rpName: "Jobpilot",
      origin: authUrls.passkeyOrigins,
      authenticatorSelection: {
        residentKey: "required",
        userVerification: "preferred",
      },
    }),
    admin(),
  ],
  session: {
    freshAge: 60 * 15,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
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
  trustedOrigins: authUrls.trustedOrigins,
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
  baseURL: authUrls.baseURL,
});
