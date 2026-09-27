import { Suspense } from "react";
import { getAdminOverview } from "@/services/admin/admin.service";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import {
  Users,
  CreditCard,
  Coins,
  TrendingDown,
  Database,
  Cpu,
  ArrowRight,
  Flag,
} from "lucide-react";
import Link from "next/link";

function OverviewSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-32 bg-slate-100 dark:bg-zinc-800/50 rounded-2xl border border-slate-200 dark:border-zinc-800"
        />
      ))}
    </div>
  );
}

async function OverviewContent() {
  const statsRes = await getAdminOverview();
  const stats = statsRes.ok
    ? statsRes.value
    : {
        totalUsers: 0,
        activeSubscriptions: 0,
        totalCreditsIssued: 0,
        totalCreditsSpent: 0,
        totalJobs: 0,
        totalAiCalls: 0,
      };

  return (
    <div className="space-y-8">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AdminStatCard
          title="Total Registered Users"
          value={stats.totalUsers.toLocaleString()}
          subtitle="Users with accounts across all tiers"
          icon={Users}
        />
        <AdminStatCard
          title="Active Subscriptions"
          value={stats.activeSubscriptions.toLocaleString()}
          subtitle="Pro tier subscribers ($15/mo)"
          icon={CreditCard}
          badge="Pro"
        />
        <AdminStatCard
          title="Total Credits Issued"
          value={stats.totalCreditsIssued.toLocaleString()}
          subtitle="Signup grants & purchases"
          icon={Coins}
        />
        <AdminStatCard
          title="Credits Consumed"
          value={stats.totalCreditsSpent.toLocaleString()}
          subtitle="Spent on resumes, letters & prep"
          icon={TrendingDown}
        />
        <AdminStatCard
          title="Jobs in Catalog"
          value={stats.totalJobs.toLocaleString()}
          subtitle="Normalized jobs across all boards"
          icon={Database}
        />
        <AdminStatCard
          title="Total AI Invocations"
          value={stats.totalAiCalls.toLocaleString()}
          subtitle="Embeddings, scoring & generation"
          icon={Cpu}
        />
      </div>

      {/* Navigation Quick Cards */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          Operational Hubs
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/dashboard/admin/users"
            className="group block p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-slate-300 dark:hover:border-zinc-700 transition shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                <Users className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <h4 className="font-semibold text-slate-900 dark:text-white text-sm">
              User Management
            </h4>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Search users, assign administrator roles, grant credits, or manage account bans.
            </p>
          </Link>

          <Link
            href="/dashboard/admin/billing"
            className="group block p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-slate-300 dark:hover:border-zinc-700 transition shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                <Coins className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <h4 className="font-semibold text-slate-900 dark:text-white text-sm">
              Credit Audit Ledger
            </h4>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Full immutable audit log of credit purchases, burns, grants, and refunds.
            </p>
          </Link>

          <Link
            href="/dashboard/admin/sources"
            className="group block p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-slate-300 dark:hover:border-zinc-700 transition shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                <Database className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <h4 className="font-semibold text-slate-900 dark:text-white text-sm">
              Job Sources & Adapters
            </h4>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Monitor ATS adapters, regional scrapers, and circuit breaker operational status.
            </p>
          </Link>

          <Link
            href="/dashboard/admin/ai-usage"
            className="group block p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-slate-300 dark:hover:border-zinc-700 transition shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                <Cpu className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <h4 className="font-semibold text-slate-900 dark:text-white text-sm">
              AI Telemetry & Costs
            </h4>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Token consumption, estimated USD expenses, and model latency per feature.
            </p>
          </Link>

          <Link
            href="/dashboard/admin/flags"
            className="group block p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-slate-300 dark:hover:border-zinc-700 transition shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                <Flag className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <h4 className="font-semibold text-slate-900 dark:text-white text-sm">
              Feature Flags Console
            </h4>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Global toggles and per-user beta overrides with Redis cache invalidation.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AdminOverviewPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Platform Overview
        </h2>
        <p className="text-sm text-slate-500 dark:text-zinc-400">
          Real-time health, monetization telemetry, and key platform indicators.
        </p>
      </div>

      <Suspense fallback={<OverviewSkeleton />}>
        <OverviewContent />
      </Suspense>
    </div>
  );
}
