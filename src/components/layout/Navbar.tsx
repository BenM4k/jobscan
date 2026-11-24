import React, { Suspense } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { PreferencesWidget } from "@/components/PreferencesWidget";
import { NavLinks } from "@/components/layout/NavLinks";
import {
  CreditPillSkeleton,
  MobileMenuButtonSkeleton,
  NavbarCreditSlot,
  NavbarMobileSlot,
  NavbarUserSlot,
  PublicNavLinksSlot,
  UserMenuSkeleton,
} from "@/components/layout/NavbarSlots";

interface NavbarProps {
  mode?: "dashboard" | "public";
}

/**
 * Static navigation shell keeping Logo, NavLinks (on dashboard), and Theme/Language PreferencesWidget
 * outside Suspense boundaries while isolating live credits and session dropdown into tight slots.
 */
export function Navbar({ mode = "dashboard" }: NavbarProps) {
  return (
    <nav
      aria-label="Main navigation"
      className="sticky border-b border-slate-300 dark:border-zinc-800 bg-white/80 dark:bg-[#0A0A0C]/90 backdrop-blur-xl top-0 z-50 transition-colors duration-300"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link
          href="/"
          aria-label="JobPilot Home"
          className="flex items-center gap-3 group"
        >
          <Logo size={36} showText badgeText="PRO" />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-4 text-sm font-medium">
          {mode === "dashboard" ? (
            <NavLinks />
          ) : (
            <Suspense fallback={null}>
              <PublicNavLinksSlot />
            </Suspense>
          )}

          <Suspense fallback={<CreditPillSkeleton />}>
            <NavbarCreditSlot />
          </Suspense>

          <PreferencesWidget />

          <Suspense fallback={<UserMenuSkeleton />}>
            <NavbarUserSlot requireAuth={mode === "dashboard"} />
          </Suspense>
        </div>

        {/* Mobile Header Right: Static Preferences + Dynamic Drawer Trigger */}
        <div className="flex items-center gap-2 md:hidden">
          <PreferencesWidget />
          <Suspense fallback={<MobileMenuButtonSkeleton />}>
            <NavbarMobileSlot />
          </Suspense>
        </div>
      </div>
    </nav>
  );
}

/** Renders the dashboard navbar loading placeholder. */
export function NavbarSkeleton() {
  return (
    <nav
      aria-label="Main navigation loading"
      className="sticky border-b border-slate-300 dark:border-zinc-800 bg-white/80 dark:bg-[#0A0A0C]/90 backdrop-blur-xl top-0 z-50 h-16 transition-colors duration-300"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link
          href="/"
          aria-label="JobPilot Home"
          className="flex items-center gap-3 group"
        >
          <Logo size={36} showText badgeText="PRO" />
        </Link>
        <div className="hidden md:flex items-center gap-4">
          <div className="w-16 h-4 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
          <div className="w-16 h-4 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-800 animate-pulse" />
        </div>
        <div className="flex md:hidden items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-zinc-800 animate-pulse" />
        </div>
      </div>
    </nav>
  );
}
