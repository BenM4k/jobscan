import React from "react";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-guard";
import { isAdmin } from "@/services/auth/admin";
import { getUserCreditBalance } from "@/services/billing/billing.service";
import { CreditBalanceIndicator } from "@/components/billing/CreditBalanceIndicator";
import { NavLinks } from "@/components/layout/NavLinks";
import { NavbarMobile } from "@/components/layout/NavbarMobile";
import { NavbarTelemetry } from "@/components/layout/NavbarTelemetry";
import { NavbarUserDropdown } from "@/components/layout/NavbarUserDropdown";

export function CreditPillSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="w-20 h-7 rounded-full bg-slate-200 dark:bg-zinc-800 animate-pulse"
    />
  );
}

export function UserMenuSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="w-10 h-8 rounded-full bg-slate-200 dark:bg-zinc-800 animate-pulse"
    />
  );
}

export function MobileMenuButtonSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-zinc-800 animate-pulse"
    />
  );
}

/** Uncached live credit pill streamed inside its own tight Suspense boundary. */
export async function NavbarCreditSlot() {
  const sessionResult = await requireSession();
  const userId = sessionResult.ok ? sessionResult.value?.user.id : undefined;
  if (!userId) return null;

  const balanceRes = await getUserCreditBalance(userId);
  const creditBalance = balanceRes.ok ? balanceRes.value : 0;

  return <CreditBalanceIndicator balance={creditBalance} />;
}

/** Session-scoped desktop user dropdown and PostHog telemetry, decoupled from billing. */
export async function NavbarUserSlot({
  requireAuth = false,
}: {
  requireAuth?: boolean;
}) {
  const sessionResult = await requireSession();
  if (requireAuth && (!sessionResult.ok || !sessionResult.value)) {
    redirect("/sign-in");
  }

  const user = sessionResult.ok ? sessionResult.value?.user : null;

  return (
    <>
      <NavbarTelemetry
        userId={user?.id}
        userEmail={user?.email}
        userName={user?.name}
      />
      <NavbarUserDropdown
        userEmail={user?.email}
        userName={user?.name}
        isAdmin={isAdmin(user)}
      />
    </>
  );
}

/** Renders dashboard nav links on public pages only when the user is signed in. */
export async function PublicNavLinksSlot() {
  const sessionResult = await requireSession();
  const user = sessionResult.ok ? sessionResult.value?.user : null;
  if (!user?.email) return null;

  return <NavLinks />;
}

/** Mobile drawer trigger and dynamic account/credit state streamed independently. */
export async function NavbarMobileSlot() {
  const sessionResult = await requireSession();
  const user = sessionResult.ok ? sessionResult.value?.user : null;
  const balanceRes = user?.id ? await getUserCreditBalance(user.id) : null;
  const creditBalance = balanceRes?.ok ? balanceRes.value : 0;

  return (
    <NavbarMobile
      userEmail={user?.email}
      creditBalance={creditBalance}
      isAdmin={isAdmin(user)}
    />
  );
}
