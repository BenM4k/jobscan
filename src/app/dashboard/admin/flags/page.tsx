import { Suspense } from "react";
import { requireSession } from "@/lib/auth-guard";
import { redirect } from "next/navigation";
import {
  getUserFeatureFlags,
  getAdminFeatureFlagAssignments,
} from "@/services/flags";
import { AdminFeatureFlagsManager } from "@/components/admin/AdminFeatureFlagsManager";

function FlagsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-48 bg-slate-100 dark:bg-zinc-800/50 rounded-2xl border border-slate-200 dark:border-zinc-800" />
      <div className="h-64 bg-slate-100 dark:bg-zinc-800/50 rounded-2xl border border-slate-200 dark:border-zinc-800" />
    </div>
  );
}

async function FlagsContent() {
  const sessionResult = await requireSession();
  if (!sessionResult.ok || !sessionResult.value) {
    redirect("/sign-in");
  }

  const user = sessionResult.value.user;

  const [flags, overrides] = await Promise.all([
    getUserFeatureFlags(user.id),
    getAdminFeatureFlagAssignments(),
  ]);

  return (
    <AdminFeatureFlagsManager
      initialFlags={flags}
      initialOverrides={overrides}
    />
  );
}

export default function AdminFlagsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Feature Flags & Rollouts
        </h2>
        <p className="text-sm text-slate-500 dark:text-zinc-400">
          Control global rollouts and manage per-user access to experimental features with real-time Redis cache invalidation.
        </p>
      </div>

      <Suspense fallback={<FlagsSkeleton />}>
        <FlagsContent />
      </Suspense>
    </div>
  );
}
