import { Suspense } from "react";
import { requireSession } from "@/lib/auth-guard";
import { redirect } from "next/navigation";
import { getUserFeatureFlags } from "@/services/flags";
import { getUserAiUsage } from "@/services/ai/usage.service";
import * as growthDal from "@/dal/growth.dal";
import { AccountSettingsCard } from "@/components/settings/AccountSettingsCard";
import { FeatureFlagsCard } from "@/components/settings/FeatureFlagsCard";
import { NotificationPreferencesCard } from "@/components/settings/NotificationPreferencesCard";
import { AiUsageProgress } from "@/components/shared/AiUsageProgress";
import { Sliders } from "lucide-react";

export const instant = false;

export const metadata = {
  title: "Settings & Preferences | Jobpilot",
  description: "Manage your user account settings, feature flag previews, and opportunity digests.",
};

function SettingsCardsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Card 1: Account Settings Skeleton */}
      <div className="bg-white dark:bg-[#121216] rounded-2xl border border-slate-200 dark:border-zinc-800/80 p-6 space-y-5">
        <div className="flex items-center gap-4 border-b border-slate-100 dark:border-zinc-800/80 pb-5">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-slate-200 dark:bg-zinc-800 shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-5 w-40 bg-slate-200 dark:bg-zinc-800 rounded-md" />
            <div className="h-4 w-52 bg-slate-200 dark:bg-zinc-800 rounded-md" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="h-16 rounded-xl bg-slate-100 dark:bg-zinc-900" />
          <div className="h-16 rounded-xl bg-slate-100 dark:bg-zinc-900" />
        </div>
      </div>

      {/* Card 2: AI Usage Skeleton */}
      <div className="bg-white dark:bg-[#121216] rounded-2xl border border-slate-200 dark:border-zinc-800/80 p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 pb-5">
          <div className="space-y-2">
            <div className="h-5 w-56 bg-slate-200 dark:bg-zinc-800 rounded-md" />
            <div className="h-3.5 w-80 max-w-full bg-slate-200 dark:bg-zinc-800 rounded-md" />
          </div>
          <div className="h-6 w-20 bg-slate-200 dark:bg-zinc-800 rounded-md" />
        </div>
        <div className="space-y-2 pt-2">
          <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-zinc-800" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-3 border-t border-slate-100 dark:border-zinc-800/60">
          <div className="h-16 rounded-xl bg-slate-100 dark:bg-zinc-900" />
          <div className="h-16 rounded-xl bg-slate-100 dark:bg-zinc-900" />
          <div className="h-16 rounded-xl bg-slate-100 dark:bg-zinc-900" />
        </div>
      </div>

      {/* Card 3: Feature Flags Skeleton */}
      <div className="bg-white dark:bg-[#121216] rounded-2xl border border-slate-200 dark:border-zinc-800/80 p-6 space-y-5">
        <div className="border-b border-slate-100 dark:border-zinc-800/80 pb-5 space-y-2">
          <div className="h-5 w-64 bg-slate-200 dark:bg-zinc-800 rounded-md" />
          <div className="h-3.5 w-96 max-w-full bg-slate-200 dark:bg-zinc-800 rounded-md" />
        </div>
        <div className="divide-y divide-slate-100 dark:divide-zinc-800/60">
          {[1, 2, 3].map((i) => (
            <div key={i} className="py-4 flex items-center justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="h-4 w-36 bg-slate-200 dark:bg-zinc-800 rounded-md" />
                <div className="h-3 w-64 bg-slate-200 dark:bg-zinc-800 rounded-md" />
              </div>
              <div className="h-6 w-11 rounded-full bg-slate-200 dark:bg-zinc-800 shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Card 4: Notification Preferences Skeleton */}
      <div className="bg-white dark:bg-[#121216] rounded-2xl border border-slate-200 dark:border-zinc-800/80 p-6 space-y-5">
        <div className="border-b border-slate-100 dark:border-zinc-800/80 pb-5 space-y-2">
          <div className="h-5 w-60 bg-slate-200 dark:bg-zinc-800 rounded-md" />
          <div className="h-3.5 w-80 max-w-full bg-slate-200 dark:bg-zinc-800 rounded-md" />
        </div>
        <div className="flex items-center justify-between gap-4 pt-1">
          <div className="space-y-2">
            <div className="h-4 w-48 bg-slate-200 dark:bg-zinc-800 rounded-md" />
            <div className="h-3 w-64 bg-slate-200 dark:bg-zinc-800 rounded-md" />
          </div>
          <div className="h-6 w-11 rounded-full bg-slate-200 dark:bg-zinc-800 shrink-0" />
        </div>
      </div>
    </div>
  );
}

async function SettingsContent() {
  const sessionResult = await requireSession();
  if (!sessionResult.ok || !sessionResult.value) {
    redirect("/sign-in");
  }

  const user = sessionResult.value.user;

  // Fetch user flags, preferences, and AI usage concurrently
  const [flags, prefResult, aiUsageResult] = await Promise.all([
    getUserFeatureFlags(user.id),
    growthDal.getUserPreferences(user.id),
    getUserAiUsage(user.id),
  ]);

  return (
    <div className="space-y-6">
      <AccountSettingsCard user={user} />
      <AiUsageProgress
        variant="card"
        usage={aiUsageResult.ok ? aiUsageResult.value : null}
      />
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
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full space-y-8 z-10">
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
