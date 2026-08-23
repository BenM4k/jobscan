import React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { Logo } from "@/components/Logo";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const t = useTranslations("auth");

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-slate-950 flex flex-col justify-center items-center p-6 text-gray-900 dark:text-slate-100 font-sans relative overflow-hidden selection:bg-blue-500 selection:text-white transition-colors duration-300">
      {/* Top Bar Theme Toggle & Locale Switcher */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>

      {/* Subtle Dot Grid Background Pattern */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20"
        style={{
          backgroundImage: `radial-gradient(#CBD5E1 1px, transparent 1px)`,
          backgroundSize: `24px 24px`,
        }}
      />

      {/* Floating Left Note Widget */}
      <div
        aria-hidden="true"
        className="hidden lg:block absolute top-20 left-12 -rotate-3 bg-[#FEF08A] dark:bg-yellow-400 text-gray-900 p-4 rounded-xl shadow-lg border border-yellow-300 max-w-50 text-left transform hover:rotate-0 transition duration-300"
      >
        <div className="w-2.5 h-2.5 rounded-full bg-rose-500 mx-auto -mt-2 mb-2 shadow-xs" />
        <p className="text-xs font-handwriting font-bold leading-snug">
          {t("noteWidget")}
        </p>
      </div>

      {/* Floating Right Status Widget */}
      <div
        aria-hidden="true"
        className="hidden lg:block absolute top-20 right-12 rotate-3 bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200 p-4 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 max-w-52 text-left transform hover:rotate-0 transition duration-300"
      >
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-bold text-gray-900 dark:text-slate-100">
            {t("statusTitle")}
          </span>
        </div>
        <p className="text-[11px] text-gray-500 dark:text-slate-400">
          {t("statusSubtitle")}
        </p>
        <div className="mt-2 text-[10px] font-mono bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300 px-2 py-0.5 rounded font-bold inline-block">
          {t("statusBadge")}
        </div>
      </div>

      {/* Central Brand Badge */}
      <div className="mb-6 z-10 text-center space-y-3">
        <Link href="/" className="inline-flex items-center group">
          <Logo size={44} showText textClassName="text-2xl" priority />
        </Link>
      </div>

      {/* Card Form Wrapper */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200/90 dark:border-slate-800 p-8 rounded-3xl max-w-md w-full space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.08)] dark:shadow-none z-10 transition duration-300">
        {children}
      </div>
    </div>
  );
}
