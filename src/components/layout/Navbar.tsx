import React from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/Logo";
import { PreferencesWidget } from "@/components/PreferencesWidget";
import { NavLinks, NavLinkItem } from "@/components/layout/NavLinks";
import { NavbarMobile } from "@/components/layout/NavbarMobile";
import { NavbarUserDropdown } from "@/components/layout/NavbarUserDropdown";
import { NavbarTelemetry } from "@/components/layout/NavbarTelemetry";

interface NavbarProps {
  userId?: string;
  userEmail?: string | null;
  userName?: string | null;
}

export async function Navbar({ userId, userEmail, userName }: NavbarProps) {
  const t = await getTranslations("nav");

  const navLinks: NavLinkItem[] = [
    { href: "/dashboard", label: t("pipeline"), icon: "📊" },
    { href: "/dashboard/resumes", label: t("resumes"), icon: "📄" },
    { href: "/dashboard/add-job", label: t("addJob"), icon: "➕" },
    { href: "/dashboard/profile", label: t("profile"), icon: "👤" },
  ];

  return (
    <nav
      aria-label="Main navigation"
      className="relative border-b border-slate-300 dark:border-zinc-800 bg-white/80 dark:bg-[#0A0A0C]/90 backdrop-blur-xl top-0 z-50 transition-colors duration-300"
    >
      <NavbarTelemetry
        userId={userId}
        userEmail={userEmail}
        userName={userName}
      />

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
          {userEmail && <NavLinks links={navLinks} />}

          <PreferencesWidget />

          <NavbarUserDropdown userEmail={userEmail} userName={userName} />
        </div>

        {/* Mobile Header Right: Unified Widget + Hamburger & Mobile Drawer */}
        <NavbarMobile navLinks={navLinks} userEmail={userEmail} />
      </div>
    </nav>
  );
}
