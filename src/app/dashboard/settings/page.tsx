import { requireSession } from "@/lib/auth-guard";
import { redirect } from "next/navigation";
import { getUserFeatureFlags } from "@/services/flags";
import * as growthDal from "@/dal/growth.dal";
import { AccountSettingsCard } from "@/components/settings/AccountSettingsCard";
import { FeatureFlagsCard } from "@/components/settings/FeatureFlagsCard";
import { NotificationPreferencesCard } from "@/components/settings/NotificationPreferencesCard";
import { Sliders } from "lucide-react";

export const metadata = {
  title: "Settings & Preferences | Jobpilot",
  description: "Manage your user account settings, feature flag previews, and opportunity digests.",
};

export default async function SettingsPage() {
  const sessionResult = await requireSession();
  if (!sessionResult.ok || !sessionResult.value) {
    redirect("/sign-in");
  }

  const user = sessionResult.value.user;

  // Fetch user flags and preferences concurrently
  const [flags, prefResult] = await Promise.all([
    getUserFeatureFlags(user.id),
    growthDal.getUserPreferences(user.id),
  ]);

  const preferences = prefResult.ok
    ? prefResult.value
    : {
        locale: "en",
        digestEmailEnabled: true,
        digestEmailFrequency: "weekly" as const,
      };

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 w-full space-y-8">
      {/* Header */}
      <div className="space-y-1.5 border-b border-slate-200 dark:border-zinc-800/80 pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-zinc-800/80 text-gray-700 dark:text-zinc-300 text-xs font-semibold">
          <Sliders className="w-3.5 h-3.5 text-blue-500" />
          <span>System & Account</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white">
          Settings & Preferences
        </h1>
        <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-2xl">
          Customize your Jobpilot experience, test preview capabilities with user-level feature flag overrides, and control email digests.
        </p>
      </div>

      {/* Cards Section */}
      <div className="space-y-6">
        <AccountSettingsCard user={user} />
        <FeatureFlagsCard flags={flags} />
        <NotificationPreferencesCard initialPreferences={preferences} />
      </div>
    </main>
  );
}
