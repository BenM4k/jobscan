import { requireSession } from "@/lib/auth-guard";
import { isAdmin } from "@/services/auth/admin";
import { redirect } from "next/navigation";
import {
  getUserFeatureFlags,
  getAdminFeatureFlagAssignments,
} from "@/services/flags";
import { AdminFeatureFlagsManager } from "@/components/admin/AdminFeatureFlagsManager";
import { ShieldAlert, Shield } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Feature Flag Administration | Jobpilot",
  description: "Global feature toggles and per-user overrides for beta testing and gradual rollouts.",
};

export default async function AdminFlagsPage() {
  const sessionResult = await requireSession();
  if (!sessionResult.ok || !sessionResult.value) {
    redirect("/sign-in");
  }

  const user = sessionResult.value.user;

  // Verify admin access via stopgap ADMIN_USER_IDS check
  if (!isAdmin(user)) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Admin Access Required
        </h1>
        <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-md mx-auto">
          Your account does not have administrator privileges to manage global feature flags or user overrides.
        </p>
        <div className="pt-4">
          <Link href="/dashboard/settings">
            <Button variant="outline" className="text-xs">
              Back to Settings
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  const [flags, overrides] = await Promise.all([
    getUserFeatureFlags(user.id),
    getAdminFeatureFlagAssignments(),
  ]);

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full space-y-8 z-10">
      {/* Header */}
      <div className="space-y-1.5 border-b border-slate-200 dark:border-zinc-800/80 pb-6">
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 text-xs font-medium font-sans">
          <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Administration console</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white font-sans">
          Feature Flags & User Overrides
        </h1>
        <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-2xl">
          Control global rollouts and manage per-user access to experimental features with real-time Redis cache invalidation.
        </p>
      </div>

      <AdminFeatureFlagsManager
        initialFlags={flags}
        initialOverrides={overrides}
      />
    </main>
  );
}
