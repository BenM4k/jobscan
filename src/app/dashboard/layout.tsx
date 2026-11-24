import { Suspense } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { hasLocale } from "next-intl";
import { requireSession } from "@/lib/auth-guard";
import { isAdmin } from "@/services/auth/admin";
import { Navbar, NavbarSkeleton } from "@/components/layout/Navbar";
import { DashboardFooter } from "@/components/layout/DashboardFooter";
import { routing } from "@/i18n/routing";

/** Resolves the authenticated user data needed by the dashboard navigation. */
async function DashboardNavbar() {
  const sessionResult = await requireSession();

  if (!sessionResult.ok || !sessionResult.value) {
    redirect("/sign-in");
  }

  const session = sessionResult.value;

  // Resolve locale outside the cache boundary so the cached Navbar
  // never calls cookies() itself (forbidden inside "use cache").
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  const locale =
    cookieLocale && hasLocale(routing.locales, cookieLocale)
      ? cookieLocale
      : routing.defaultLocale;

  return (
    <Navbar
      userId={session.user.id}
      userEmail={session.user.email}
      userName={session.user.name}
      isAdmin={isAdmin(session.user)}
      locale={locale}
    />
  );
}

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

      <Suspense fallback={<NavbarSkeleton />}>
        <DashboardNavbar />
      </Suspense>

      <div className="flex-1 flex flex-col z-10">
        <Suspense fallback={<div className="flex-1" />}>
          <DashboardAuthGate>{children}</DashboardAuthGate>
        </Suspense>
      </div>

      <DashboardFooter />
    </div>
  );
}
