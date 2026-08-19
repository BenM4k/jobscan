import Link from "next/link";
import { Suspense } from "react";
import { requireSession } from "@/lib/auth-guard";
import { Navbar } from "@/components/layout/Navbar";
import { getTranslations } from "next-intl/server";

export const instant = false;

async function LandingNavbar() {
  const sessionResult = await requireSession();
  const userEmail = sessionResult.ok ? sessionResult.value?.user?.email : null;
  return <Navbar userEmail={userEmail} />;
}

async function LandingCTA() {
  const [sessionResult, t] = await Promise.all([
    requireSession(),
    getTranslations("landing"),
  ]);
  const isAuthenticated = sessionResult.ok && sessionResult.value !== null;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      {isAuthenticated ? (
        <Link
          href="/dashboard"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-7 py-3.5 rounded-xl shadow-lg shadow-blue-500/25 transition transform hover:-translate-y-0.5"
        >
          {t("ctaLoggedIn")}
        </Link>
      ) : (
        <Link
          href="/sign-up"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-7 py-3.5 rounded-xl shadow-lg shadow-blue-500/25 transition transform hover:-translate-y-0.5"
        >
          {t("ctaLoggedOut")}
        </Link>
      )}
    </div>
  );
}

export default async function LandingPage() {
  const t = await getTranslations("landing");

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0A0A0C] text-gray-900 dark:text-zinc-100 font-sans flex flex-col selection:bg-blue-500 selection:text-white relative overflow-hidden transition-colors duration-300">
      {/* Subtle Dot Grid Background Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20"
        style={{
          backgroundImage: `radial-gradient(#CBD5E1 1px, transparent 1px)`,
          backgroundSize: `24px 24px`,
        }}
      />

      <header>
        <Suspense
          fallback={
            <div className="h-16 border-b border-slate-300 dark:border-zinc-800 bg-white/80 dark:bg-[#0A0A0C]/90" />
          }
        >
          <LandingNavbar />
        </Suspense>
      </header>

      {/* Floating Tactical Widgets */}
      <main className="relative flex-1 flex flex-col items-center justify-center text-center px-6 py-20 max-w-5xl mx-auto">
        {/* Floating Top-Left Sticky Note Widget */}
        <div
          aria-hidden="true"
          className="hidden lg:block absolute top-12 left-0 -rotate-3 bg-[#FEF08A] dark:bg-yellow-400 text-gray-900 p-4 rounded-xl shadow-lg border border-yellow-300 max-w-50 text-left transform hover:rotate-0 transition duration-300"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 mx-auto -mt-2 mb-2 shadow-xs" />
          <p className="text-xs font-handwriting font-bold leading-snug">
            {t("stickyNote")}
          </p>
        </div>

        {/* Floating Top-Right Reminders Widget */}
        <div
          aria-hidden="true"
          className="hidden lg:block absolute top-12 right-0 rotate-3 bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200 p-4 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 max-w-55 text-left transform hover:rotate-0 transition duration-300"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">⏱️</span>
            <span className="text-xs font-bold text-gray-900 dark:text-slate-100">
              {t("scheduledIngest")}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-slate-400">
            {t("scheduledSources")}
          </p>
          <div className="mt-2 text-[10px] font-mono bg-blue-50 dark:bg-indigo-950 text-blue-600 dark:text-indigo-300 px-2 py-1 rounded-md font-semibold inline-block">
            {t("scheduledTime")}
          </div>
        </div>

        {/* Central Logo Badge */}
        <div
          aria-hidden="true"
          className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 shadow-xl flex items-center justify-center mb-6 relative group"
        >
          <div className="grid grid-cols-2 gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-blue-500" />
            <span className="w-3.5 h-3.5 rounded-full bg-gray-900 dark:bg-slate-100" />
            <span className="w-3.5 h-3.5 rounded-full bg-gray-900 dark:bg-slate-100" />
            <span className="w-3.5 h-3.5 rounded-full bg-gray-900 dark:bg-slate-100" />
          </div>
        </div>

        {/* Hero Title & Subtitle */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-slate-100 leading-tight mb-4">
          {t("heroTitle1")} <br />
          <span className="text-gray-400 dark:text-slate-500 font-normal">
            {t("heroTitle2")}
          </span>
        </h1>

        <p className="text-gray-600 dark:text-slate-400 text-base sm:text-lg max-w-xl mb-8 leading-relaxed font-normal">
          {t("heroSubtitle")}
        </p>

        {/* CTA Button */}
        <Suspense
          fallback={
            <Link
              href="/sign-up"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-7 py-3.5 rounded-xl shadow-lg shadow-blue-500/25 transition transform hover:-translate-y-0.5"
            >
              {t("ctaLoggedOut")}
            </Link>
          }
        >
          <LandingCTA />
        </Suspense>

        {/* Bottom Floating Cards Preview */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 mt-16 text-left">
          {/* Today's Applications Widget */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-gray-900 dark:text-slate-100 uppercase tracking-wider">
                {t("pipelinePreviewTitle")}
              </h3>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                {t("activeIngest")}
              </span>
            </div>

            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-950 flex items-center justify-between border border-gray-100 dark:border-slate-800">
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-slate-200">
                    Senior Staff Frontend Engineer
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">
                    Greenhouse • Airbnb
                  </p>
                </div>
                <span className="text-xs font-bold text-blue-600 dark:text-indigo-400 bg-blue-50 dark:bg-indigo-950 px-2 py-1 rounded-md">
                  {t("match96")}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-950 flex items-center justify-between border border-gray-100 dark:border-slate-800">
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-slate-200">
                    Tech Lead Architect
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">
                    Lever • Stripe
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-1 rounded-md">
                  {t("match92")}
                </span>
              </div>
            </div>
          </div>

          {/* Job Sources & Integrations Widget */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-gray-900 dark:text-slate-100 uppercase tracking-wider">
                {t("boardsTitle")}
              </h3>
              <span className="text-xs text-gray-400">{t("integrated")}</span>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-2">
              <div className="p-3 bg-gray-50 dark:bg-slate-950 rounded-xl text-center border border-gray-100 dark:border-slate-800">
                <span className="text-base block mb-1">🌿</span>
                <span className="text-[10px] font-bold text-gray-700 dark:text-slate-300">
                  Greenhouse
                </span>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-slate-950 rounded-xl text-center border border-gray-100 dark:border-slate-800">
                <span className="text-base block mb-1">🌐</span>
                <span className="text-[10px] font-bold text-gray-700 dark:text-slate-300">
                  RemoteOK
                </span>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-slate-950 rounded-xl text-center border border-gray-100 dark:border-slate-800">
                <span className="text-base block mb-1">⚡</span>
                <span className="text-[10px] font-bold text-gray-700 dark:text-slate-300">
                  Lever
                </span>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-slate-950 rounded-xl text-center border border-gray-100 dark:border-slate-800">
                <span className="text-base block mb-1">🤖</span>
                <span className="text-[10px] font-bold text-gray-700 dark:text-slate-300">
                  Gemini Flash
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
