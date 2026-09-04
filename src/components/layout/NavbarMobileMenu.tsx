"use client";

import React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface NavLinkItem {
  href: string;
  label: string;
  icon: string;
}

interface NavbarMobileMenuProps {
  open: boolean;
  onClose: () => void;
  userEmail?: string | null;
  pathname: string;
  navLinks: NavLinkItem[];
  onSignOut: () => void;
}

export function NavbarMobileMenu({
  open,
  onClose,
  userEmail,
  pathname,
  navLinks,
  onSignOut,
}: NavbarMobileMenuProps) {
  const t = useTranslations("nav");

  if (!open) return null;

  return (
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
                  onClick={onClose}
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
              onClose();
              onSignOut();
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
            onClick={onClose}
            className="w-full text-center border border-gray-200 dark:border-zinc-800 text-gray-800 dark:text-zinc-200 font-bold text-xs px-4 py-2.5 rounded-xl transition hover:bg-gray-50 dark:hover:bg-zinc-900"
          >
            {t("signIn")}
          </Link>
          <Link
            href="/sign-up"
            onClick={onClose}
            className="w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-md shadow-blue-500/20"
          >
            {t("signUp")}
          </Link>
        </div>
      )}
    </div>
  );
}
