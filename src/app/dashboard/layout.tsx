import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-guard";
import { Navbar } from "@/components/layout/Navbar";
import { DashboardFooter } from "@/components/layout/DashboardFooter";

/** Verifies session inside Suspense so the outer dashboard shell stays static/prerenderable. */
async function DashboardAuthGate({ children }: { children: React.ReactNode }) {
  const sessionResult = await requireSession();
  if (!sessionResult.ok || !sessionResult.value) {
    redirect("/sign-in");
  }

  return <>{children}</>;
}

/** Provides the shared navigation, background, and footer for dashboard pages. */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0A0A0C] text-gray-900 dark:text-zinc-100 font-sans flex flex-col relative overflow-x-clip transition-colors duration-300">
      {/* Subtle Dot Grid Background Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20"
        style={{
          backgroundImage: `radial-gradient(#CBD5E1 1px, transparent 1px)`,
          backgroundSize: `24px 24px`,
        }}
      />

      <Navbar mode="dashboard" />

      <div className="flex-1 flex flex-col z-10">
        <Suspense fallback={<div className="flex-1" />}>
          <DashboardAuthGate>{children}</DashboardAuthGate>
        </Suspense>
      </div>

      <DashboardFooter />
    </div>
  );
}
