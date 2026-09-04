"use client";

import React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface NavbarUserSectionProps {
  userEmail?: string | null;
  onSignOut: () => void;
}

export function NavbarUserSection({
  userEmail,
  onSignOut,
}: NavbarUserSectionProps) {
  const t = useTranslations("nav");

  if (userEmail) {
    return (
      <div className="flex items-center gap-3 pl-2 border-l border-slate-300 dark:border-slate-800">
        <div
          aria-label={`Signed in as ${userEmail}`}
          title={userEmail}
          className="w-8 h-8 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center uppercase shadow-xs"
        >
          {userEmail.slice(0, 2)}
        </div>
        <button
          onClick={onSignOut}
          aria-label={t("signOut")}
          className="bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/60 hover:text-rose-600 dark:hover:text-rose-300 text-gray-800 dark:text-slate-300 px-3.5 py-1.5 rounded-xl text-xs font-bold transition border border-slate-300 dark:border-slate-700/80 cursor-pointer shadow-xs"
        >
          {t("signOut")}
        </button>
      </div>
    );
  }

  return (
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
  );
}
