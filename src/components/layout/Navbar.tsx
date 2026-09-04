"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { signOut } from "@/services/auth/auth-client";
import { PreferencesWidget } from "@/components/PreferencesWidget";
import { Logo } from "@/components/Logo";
import { NavbarMobileMenu } from "@/components/layout/NavbarMobileMenu";
import { NavbarUserSection } from "@/components/layout/NavbarUserSection";
import posthog from "posthog-js";

interface NavbarProps {
  userId?: string;
  userEmail?: string | null;
  userName?: string | null;
}

export function Navbar({ userId, userEmail, userName }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const identifiedUserId = React.useRef<string | null>(null);
  const identifiedProps = React.useRef<{ email?: string | null; name?: string | null }>({});
  const t = useTranslations("nav");

  React.useEffect(() => {
    if (!userId) {
      if (identifiedUserId.current) {
        posthog.reset();
        identifiedUserId.current = null;
        identifiedProps.current = {};
      }
      return;
    }

    const propsChanged =
      identifiedProps.current.email !== userEmail ||
      identifiedProps.current.name !== userName;

    if (identifiedUserId.current === userId && !propsChanged) {
      return;
    }

    if (identifiedUserId.current && identifiedUserId.current !== userId) {
      posthog.reset();
    }

    posthog.identify(userId, {
      email: userEmail ?? undefined,
      name: userName ?? undefined,
    });
    identifiedUserId.current = userId;
    identifiedProps.current = { email: userEmail, name: userName };
  }, [userId, userEmail, userName]);

  const handleSignOut = async () => {
    await signOut();
    posthog.reset();
    router.push("/");
    router.refresh();
  };

  const navLinks = [
    { href: "/dashboard", label: t("pipeline"), icon: "📊" },
    { href: "/dashboard/add-job", label: t("addJob"), icon: "➕" },
    { href: "/dashboard/profile", label: t("profile"), icon: "👤" },
  ];

  return (
    <nav
      aria-label="Main navigation"
      className="border-b border-slate-300 dark:border-zinc-800 bg-white/80 dark:bg-[#0A0A0C]/90 backdrop-blur-xl sticky top-0 z-50 transition-colors duration-300"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" aria-label="JobPilot Home" className="flex items-center gap-3 group">
          <Logo size={36} showText badgeText="PRO" />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-4 text-sm font-medium">
          {userEmail && (
            <div
              role="navigation"
              aria-label="Dashboard sections"
              className="flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/70 p-1 rounded-xl border border-slate-300 dark:border-slate-700/60"
            >
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 inline-flex items-center gap-1.5 ${
                      isActive
                        ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-indigo-400 shadow-xs border border-slate-300 dark:border-slate-800 font-bold"
                        : "text-gray-700 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200"
                    }`}
                  >
                    <span aria-hidden="true">{link.icon}</span>
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>
          )}

          <PreferencesWidget />

          <NavbarUserSection userEmail={userEmail} onSignOut={handleSignOut} />
        </div>

        {/* Mobile Header Right: Unified Widget + Hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          <PreferencesWidget />

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle mobile menu"
            className="p-2 rounded-xl text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer"
          >
            <span className="text-xl font-bold">{mobileMenuOpen ? "✕" : "☰"}</span>
          </button>
        </div>
      </div>

      <NavbarMobileMenu
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        userEmail={userEmail}
        pathname={pathname}
        navLinks={navLinks}
        onSignOut={handleSignOut}
      />
    </nav>
  );
}
