"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { signOut } from "@/services/auth/auth-client";
import { PreferencesWidget } from "@/components/PreferencesWidget";
import posthog from "posthog-js";

import { Logo } from "@/components/Logo";

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
  const t = useTranslations("nav");

  React.useEffect(() => {
    if (!userId || identifiedUserId.current === userId) return;

    if (identifiedUserId.current) {
      posthog.reset();
    }

    posthog.identify(userId, {
      email: userEmail ?? undefined,
      name: userName ?? undefined,
    });
    identifiedUserId.current = userId;
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

          {/* Unified Preferences Widget (Language + Light/Dark Mode) */}
          <PreferencesWidget />

          {userEmail ? (
            <div className="flex items-center gap-3 pl-2 border-l border-slate-300 dark:border-slate-800">
              <div
                aria-label={`Signed in as ${userEmail}`}
                title={userEmail}
                className="w-8 h-8 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center uppercase shadow-xs"
              >
                {userEmail.slice(0, 2)}
              </div>
              <button
                onClick={handleSignOut}
                aria-label={t("signOut")}
                className="bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/60 hover:text-rose-600 dark:hover:text-rose-300 text-gray-800 dark:text-slate-300 px-3.5 py-1.5 rounded-xl text-xs font-bold transition border border-slate-300 dark:border-slate-700/80 cursor-pointer shadow-xs"
              >
                {t("signOut")}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/sign-in"
                className="text-xs font-bold text-gray-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-indigo-400 transition"
              >
                {t("signIn")}
              </Link>
              <Link
                href="/sign-up"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition text-xs font-bold shadow-md shadow-blue-500/20"
              >
                {t("signUp")}
              </Link>
            </div>
          )}
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

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-zinc-800 bg-white/95 dark:bg-[#0A0A0C]/95 backdrop-blur-2xl px-6 py-4 space-y-4 shadow-xl">
          {userEmail ? (
            <>
              <div className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-zinc-900 rounded-xl border border-gray-200/60 dark:border-zinc-800">
                <div className="w-8 h-8 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center uppercase">
                  {userEmail.slice(0, 2)}
                </div>
                <div className="truncate text-xs font-semibold text-gray-800 dark:text-zinc-200">
                  {userEmail}
                </div>
              </div>

              <div className="flex flex-col space-y-1">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      aria-current={isActive ? "page" : undefined}
                      className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
                        isActive
                          ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                          : "text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <span>{link.icon}</span>
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </div>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleSignOut();
                }}
                className="w-full text-center bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                {t("signOut")}
              </button>
            </>
          ) : (
            <div className="flex flex-col space-y-2 pt-1">
              <Link
                href="/sign-in"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center border border-gray-200 dark:border-zinc-800 text-gray-800 dark:text-zinc-200 font-bold text-xs px-4 py-2.5 rounded-xl transition hover:bg-gray-50 dark:hover:bg-zinc-900"
              >
                {t("signIn")}
              </Link>
              <Link
                href="/sign-up"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-md shadow-blue-500/20"
              >
                {t("signUp")}
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
