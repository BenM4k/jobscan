import { requireSession } from "@/lib/auth-guard";
import { isAdmin } from "@/services/auth/admin";
import { redirect } from "next/navigation";
import { Shield, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AdminNav } from "@/components/admin/AdminNav";

export const metadata = {
  title: "Administration | Jobpilot",
  description: "Jobpilot central administration and operational console.",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionResult = await requireSession();
  if (!sessionResult.ok || !sessionResult.value) {
    redirect("/sign-in");
  }

  const user = sessionResult.value.user;

  if (!isAdmin(user)) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
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
          <Link href="/dashboard">
            <Button variant="outline" className="text-xs">
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full space-y-6">
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
      <div className="pt-2">
        {children}
      </div>
    </main>
  );
}
