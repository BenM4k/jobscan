import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth-guard";
import { redirect } from "next/navigation";
import { Shield, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { AdminNav } from "@/components/admin/AdminNav";

export const metadata = {
  title: "Administration | Jobpilot",
  description: "Jobpilot central administration and operational console.",
};

function AdminLayoutSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-16 border-b border-slate-200 dark:border-zinc-800 pb-5" />
      <div className="h-10 bg-slate-100 dark:bg-zinc-800/50 rounded-xl" />
      <div className="h-96 bg-slate-100 dark:bg-zinc-800/50 rounded-2xl" />
    </div>
  );
}

async function AdminGuard({ children }: { children: React.ReactNode }) {
  const adminResult = await requireAdmin();
  if (!adminResult.ok) {
    if (adminResult.error.code === "UNAUTHORIZED") {
      redirect("/sign-in");
    }

    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center border border-red-200 dark:border-red-900/50">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Admin Access Required
        </h1>
        <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-md mx-auto">
          Your account does not have administrator privileges to view this console. If you believe this is an error, contact your system administrator.
        </p>
        <div className="pt-4">
          <Link
            href="/dashboard"
            className={buttonVariants({ variant: "outline", className: "text-xs" })}
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-zinc-800 pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 text-xs font-medium">
            <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Platform Administration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Operations & Control
          </h1>
        </div>
      </div>

      {/* Navigation tabs */}
      <AdminNav />

      {/* Child route content */}
      <div className="pt-2">{children}</div>
    </>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full space-y-6">
      <Suspense fallback={<AdminLayoutSkeleton />}>
        <AdminGuard>{children}</AdminGuard>
      </Suspense>
    </main>
  );
}
