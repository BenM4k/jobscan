import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { DashboardFooter } from "@/components/layout/DashboardFooter";
import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("privacy");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export const instant = false;

export default async function PrivacyPolicyPage() {
  const t = await getTranslations("privacy");

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0A0A0C] text-gray-900 dark:text-zinc-100 font-sans flex flex-col relative overflow-hidden transition-colors duration-300">
      {/* Subtle Dot Grid Background Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20"
        style={{
          backgroundImage: `radial-gradient(#CBD5E1 1px, transparent 1px)`,
          backgroundSize: `24px 24px`,
        }}
      />

      <Suspense
        fallback={
          <div className="h-16 border-b border-slate-300 dark:border-zinc-800 bg-white/80 dark:bg-[#0A0A0C]/90" />
        }
      >
        <Navbar />
      </Suspense>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-12 sm:py-16 z-10">
        {/* Page Header */}
        <div className="mb-10 space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-zinc-500 font-mono mb-4">
            <Link
              href="/"
              className="hover:text-gray-700 dark:hover:text-zinc-300 transition-colors"
            >
              {t("home")}
            </Link>
            <span>/</span>
            <span className="text-gray-600 dark:text-zinc-400">{t("title")}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-medium text-gray-900 dark:text-slate-100 leading-tight tracking-tight">
            {t("title")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            {t("lastUpdated")}
          </p>
        </div>

        {/* Content */}
        <div className="space-y-10 prose-like">
          <Section title={t("s1Title")}>
            <p>{t("s1P1")}</p>
            <p>{t("s1P2")}</p>
          </Section>

          <Section title={t("s2Title")}>
            <SubHeading>{t("s2Sub1")}</SubHeading>
            <p>{t("s2Sub1P")}</p>
            <SubHeading>{t("s2Sub2")}</SubHeading>
            <p>{t("s2Sub2P")}</p>
            <SubHeading>{t("s2Sub3")}</SubHeading>
            <p>{t("s2Sub3P")}</p>
            <SubHeading>{t("s2Sub4")}</SubHeading>
            <p>{t("s2Sub4P")}</p>
          </Section>

          <Section title={t("s3Title")}>
            <ul>
              <li>{t("s3Item1")}</li>
              <li>{t("s3Item2")}</li>
              <li>{t("s3Item3")}</li>
              <li>{t("s3Item4")}</li>
              <li>{t("s3Item5")}</li>
            </ul>
          </Section>

          <Section title={t("s4Title")}>
            <p>{t("s4P1")}</p>
            <ul>
              <li>
                <strong>Google Gemini</strong> —{" "}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-600 dark:text-violet-400 underline underline-offset-2"
                >
                  Google Privacy Policy
                </a>
              </li>
              <li>
                <strong>Anthropic Claude</strong> —{" "}
                <a
                  href="https://www.anthropic.com/legal/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-600 dark:text-violet-400 underline underline-offset-2"
                >
                  Anthropic Privacy Policy
                </a>
              </li>
              <li>
                <strong>OpenAI</strong> —{" "}
                <a
                  href="https://openai.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-600 dark:text-violet-400 underline underline-offset-2"
                >
                  OpenAI Privacy Policy
                </a>
              </li>
            </ul>
            <p>{t("s4P2")}</p>
          </Section>

          <Section title={t("s5Title")}>
            <p>{t("s5P1")}</p>
            <p>{t("s5P2")}</p>
          </Section>

          <Section title={t("s6Title")}>
            <p>{t("s6P1")}</p>
          </Section>

          <Section title={t("s7Title")}>
            <p>{t("s7P1")}</p>
          </Section>

          <Section title={t("s8Title")}>
            <p>{t("s8P1")}</p>
            <ul>
              <li>{t("s8Item1")}</li>
              <li>{t("s8Item2")}</li>
              <li>{t("s8Item3")}</li>
              <li>{t("s8Item4")}</li>
              <li>{t("s8Item5")}</li>
            </ul>
            <p>{t("s8P2")}</p>
          </Section>

          <Section title={t("s9Title")}>
            <p>{t("s9P1")}</p>
          </Section>

          <Section title={t("s10Title")}>
            <p>{t("s10P1")}</p>
          </Section>

          <Section title={t("s11Title")}>
            <p>{t("s11P1")}</p>
          </Section>

          <Section title={t("s12Title")}>
            <p>{t("s12P1")}</p>
            <div className="mt-3 p-4 bg-white dark:bg-[#141417] border border-slate-200 dark:border-zinc-800 rounded-2xl text-sm">
              <p className="font-semibold text-gray-900 dark:text-slate-100">JobPilot</p>
              <p className="text-gray-500 dark:text-zinc-400">privacy@jobpilot.app</p>
            </div>
          </Section>
        </div>

        {/* Back link */}
        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-zinc-800 flex flex-wrap gap-6">
          <Link
            href="/"
            className="text-sm text-violet-600 dark:text-violet-400 hover:underline underline-offset-2 font-medium transition-colors"
          >
            {t("backToJobPilot")}
          </Link>
          <Link
            href="/terms"
            className="text-sm text-gray-500 dark:text-zinc-400 hover:underline underline-offset-2 transition-colors"
          >
            {t("termsOfService")}
          </Link>
        </div>
      </main>

      <DashboardFooter />
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 border-b border-slate-200 dark:border-zinc-800 pb-2">
        {title}
      </h2>
      <div className="space-y-3 text-sm text-gray-600 dark:text-zinc-300 leading-relaxed [&_strong]:font-semibold [&_strong]:text-gray-800 [&_strong]:dark:text-zinc-100 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_a]:text-violet-600 [&_a]:dark:text-violet-400">
        {children}
      </div>
    </section>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-gray-800 dark:text-zinc-100 mt-2">
      {children}
    </h3>
  );
}
