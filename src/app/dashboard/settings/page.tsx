import { Suspense } from "react";
import { headers } from "next/headers";
import { requireSession } from "@/lib/auth-guard";
import { redirect } from "next/navigation";
import { auth } from "@/services/auth/auth";
import { getUserFeatureFlags } from "@/services/flags";
import { getUserAiUsage } from "@/services/ai/usage.service";
import * as growthDal from "@/dal/growth.dal";
import * as authDal from "@/dal/auth.dal";
import { AccountSettingsCard } from "@/components/settings/AccountSettingsCard";
import { SessionManagementCard } from "@/components/settings/SessionManagementCard";
import type { SessionData } from "@/components/settings/session-utils";
import { PasskeyManagementCard, type PasskeyItem } from "@/components/settings/PasskeyManagementCard";
import { FeatureFlagsCard } from "@/components/settings/FeatureFlagsCard";
import { NotificationPreferencesCard } from "@/components/settings/NotificationPreferencesCard";
import { SettingsCardsSkeleton } from "@/components/settings/SettingsCardsSkeleton";
import { AiUsageProgress } from "@/components/shared/AiUsageProgress";
import { Sliders, Shield } from "lucide-react";
import Link from "next/link";
import { isAdmin } from "@/services/auth/admin";

export const metadata = {
  title: "Settings & Preferences | Jobpilot",
  description: "Manage your user account settings, active sessions, passkeys, and preferences.",
};

async function SettingsContent() {
  const sessionResult = await requireSession();
  if (!sessionResult.ok || !sessionResult.value) {
    redirect("/sign-in");
  }

  const user = sessionResult.value.user;
  const currentSession = sessionResult.value.session;
  const currentToken = currentSession.token;
  const reqHeaders = await headers();

  // Fetch user flags, preferences, AI usage, sessions, and passkeys concurrently on server
  const [flags, prefResult, aiUsageResult, sessionsResult, passkeysResult] = await Promise.all([
    getUserFeatureFlags(user.id),
    growthDal.getUserPreferences(user.id),
    getUserAiUsage(user.id),
    authDal.getActiveSessionsForUser(user.id),
    authDal.getUserPasskeys(user.id),
  ]);

  let sessionsList: SessionData[] = sessionsResult.ok
    ? (sessionsResult.value as unknown as SessionData[])
    : [];

  if (sessionsList.length === 0) {
    try {
      const apiSessions = await auth.api.listSessions({ headers: reqHeaders });
      if (Array.isArray(apiSessions) && apiSessions.length > 0) {
        sessionsList = apiSessions as unknown as SessionData[];
      }
    } catch {
      // Ignored: fallback to verified current session
    }
  }

  const currentSessionData: SessionData = {
    id: currentSession.id,
    token: currentSession.token,
    createdAt: currentSession.createdAt,
    expiresAt: currentSession.expiresAt,
    ipAddress: currentSession.ipAddress,
    userAgent: currentSession.userAgent,
    userId: user.id,
  };

  if (sessionsList.length === 0) {
    sessionsList = [currentSessionData];
  } else if (!sessionsList.some((s) => s.token === currentToken)) {
    sessionsList.unshift(currentSessionData);
  }

  let passkeysList: PasskeyItem[] = passkeysResult.ok
    ? (passkeysResult.value as unknown as PasskeyItem[])
    : [];

  if (passkeysList.length === 0) {
    try {
      const apiPasskeys = await auth.api.listPasskeys({ headers: reqHeaders });
      if (Array.isArray(apiPasskeys) && apiPasskeys.length > 0) {
        passkeysList = apiPasskeys as unknown as PasskeyItem[];
      }
    } catch {
      // Passkey table might not have credentials
    }
  }

  return (
    <div className="space-y-6">
      {isAdmin(user) && (
        <div className="rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Admin Console Access
              </h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                You have administrator privileges. Manage global rollouts and per-user feature flag overrides.
              </p>
            </div>
          </div>
          <Link href="/dashboard/admin">
            <span className="inline-flex items-center px-3.5 py-1.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-xs font-semibold cursor-pointer transition">
              Manage Overrides
            </span>
          </Link>
        </div>
      )}
      <AccountSettingsCard user={user} />
      <SessionManagementCard
        initialSessions={sessionsList}
        currentSessionToken={currentToken}
      />
      <PasskeyManagementCard
        initialPasskeys={passkeysList}
      />
      {aiUsageResult.ok ? (
        <AiUsageProgress
          variant="card"
          usage={aiUsageResult.value}
        />
      ) : (
        <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 p-6 text-sm text-red-600 dark:text-red-400">
          Failed to load AI usage details. Please refresh the page to retry.
        </div>
      )}
      <FeatureFlagsCard flags={flags} />
      {prefResult.ok ? (
        <NotificationPreferencesCard initialPreferences={prefResult.value} />
      ) : (
        <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 p-6 text-sm text-red-600 dark:text-red-400">
          Failed to load notification preferences. Please refresh the page to retry.
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full space-y-8 z-10">
      {/* Header */}
      <div className="space-y-1.5 border-b border-slate-200 dark:border-zinc-800/80 pb-6">
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700/60 text-xs font-medium font-sans">
          <Sliders className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>System & account</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white font-sans">
          Settings & Preferences
        </h1>
        <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-2xl">
          Customize your Jobpilot experience, test preview capabilities with user-level feature flag overrides, and control email digests.
        </p>
      </div>

      {/* Dynamic Content behind Suspense */}
      <Suspense fallback={<SettingsCardsSkeleton />}>
        <SettingsContent />
      </Suspense>
    </main>
  );
}
