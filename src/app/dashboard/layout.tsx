import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-guard";
import { Navbar, NavbarSkeleton } from "@/components/layout/Navbar";
import { DashboardFooter } from "@/components/layout/DashboardFooter";

/** Resolves the authenticated user data needed by the dashboard navigation. */
async function DashboardNavbar() {
  const sessionResult = await requireSession();

  if (!sessionResult.ok || !sessionResult.value) {
    redirect("/sign-in");
  }

  const session = sessionResult.value;

  return (
    <Navbar
      userId={session.user.id}
      userEmail={session.user.email}
      userName={session.user.name}
    />
  );
}

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/** Provides the shared navigation, background, and footer for dashboard pages. */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionResult = await requireSession();
  if (!sessionResult.ok || !sessionResult.value) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0A0A0C] text-gray-900 dark:text-zinc-100 font-sans flex flex-col relative overflow-hidden transition-colors duration-300">
      {/* Subtle Dot Grid Background Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20"
        style={{
          backgroundImage: `radial-gradient(#CBD5E1 1px, transparent 1px)`,
          backgroundSize: `24px 24px`,
        }}
      />

      <Suspense fallback={<NavbarSkeleton />}>
        <DashboardNavbar />
      </Suspense>

      <div className="flex-1 flex flex-col z-10">{children}</div>

      <DashboardFooter />
    </div>
  );
}
