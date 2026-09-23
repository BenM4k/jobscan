"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { PreferencesWidget } from "@/components/PreferencesWidget";
import { useSignOut } from "@/hooks/useSignOut";
import { NavLinkItem } from "@/components/layout/NavLinks";

interface NavbarMobileProps {
  navLinks: NavLinkItem[];
  userEmail?: string | null;
  creditBalance?: number;
}

/** Renders the mobile dashboard menu, credit balance, and account controls. */
export function NavbarMobile({ navLinks, userEmail, creditBalance = 0 }: NavbarMobileProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const t = useTranslations("nav");
  const handleSignOut = useSignOut();

  const closeMenu = () => setOpen(false);

  const onSignOutClick = async () => {
    closeMenu();
    await handleSignOut();
  };

  return (
    <div className="flex items-center gap-2 md:hidden">
      <PreferencesWidget />

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label="Toggle mobile menu"
        className="p-2 rounded-xl text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer"
      >
        <span className="text-xl font-bold">{open ? "✕" : "☰"}</span>
      </button>

      {open && (
        <div className="absolute top-16 left-0 right-0 w-full border-t border-b border-gray-200 dark:border-zinc-800 bg-white/95 dark:bg-[#0A0A0C]/95 backdrop-blur-2xl px-6 py-4 space-y-4 shadow-xl text-left z-50">
          {userEmail ? (
            <>
              <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-zinc-900 rounded-xl border border-gray-200/60 dark:border-zinc-800">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center uppercase shadow-xs shrink-0">
                    {userEmail.slice(0, 2)}
                  </div>
                  <div className="truncate text-xs font-semibold text-gray-800 dark:text-zinc-200">
                    {userEmail}
                  </div>
                </div>
                <Link
                  href="/dashboard/billing"
                  onClick={closeMenu}
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0"
                >
                  ⚡ {creditBalance}
                </Link>
              </div>

              <div className="flex flex-col space-y-1">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={closeMenu}
                      aria-current={isActive ? "page" : undefined}
                      className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
                        isActive
                          ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                          : "text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <span aria-hidden="true">{link.icon}</span>
                      <span>{link.label}</span>
                    </Link>
                  );
                })}

                <Link
                  href="/dashboard/billing"
                  onClick={closeMenu}
                  aria-current={
                    pathname === "/dashboard/billing" ? "page" : undefined
                  }
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                    pathname === "/dashboard/billing"
                      ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                      : "text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span aria-hidden="true">💳</span>
                    <span>{t("billing")}</span>
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60">
                    {creditBalance} credits
                  </span>
                </Link>

                <Link
                  href="/dashboard/settings"
                  onClick={closeMenu}
                  aria-current={
                    pathname === "/dashboard/settings" ? "page" : undefined
                  }
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                    pathname === "/dashboard/settings"
                      ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                      : "text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span aria-hidden="true">⚙️</span>
                    <span>{t("settings")}</span>
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60">
                    Flags
                  </span>
                </Link>
              </div>

              <button
                type="button"
                onClick={onSignOutClick}
                className="w-full text-center bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                {t("signOut")}
              </button>
            </>
          ) : (
            <div className="flex flex-col space-y-2 pt-1">
              <Link
                href="/sign-in"
                onClick={closeMenu}
                className="w-full text-center border border-gray-200 dark:border-zinc-800 text-gray-800 dark:text-zinc-200 font-bold text-xs px-4 py-2.5 rounded-xl transition hover:bg-gray-50 dark:hover:bg-zinc-900"
              >
                {t("signIn")}
              </Link>
              <Link
                href="/sign-up"
                onClick={closeMenu}
                className="w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-md shadow-blue-500/20"
              >
                {t("signUp")}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
