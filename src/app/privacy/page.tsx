import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { DashboardFooter } from "@/components/layout/DashboardFooter";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — JobPilot",
  description:
    "Learn how JobPilot collects, uses, and protects your personal data when you use our AI-powered job search automation service.",
};

export const instant = false;

export default function PrivacyPolicyPage() {
  const lastUpdated = "August 23, 2025";

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
              Home
            </Link>
            <span>/</span>
            <span className="text-gray-600 dark:text-zinc-400">Privacy Policy</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-medium text-gray-900 dark:text-slate-100 leading-tight tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Last updated: {lastUpdated}
          </p>
        </div>

        {/* Content */}
        <div className="space-y-10 prose-like">
          <Section title="1. Introduction">
            <p>
              Welcome to <strong>JobPilot</strong> (&quot;we,&quot; &quot;our,&quot; or
              &quot;us&quot;). JobPilot is a personal job search automation tool that helps
              you discover relevant job opportunities, score them against your resume using
              AI, and manage your application pipeline.
            </p>
            <p>
              This Privacy Policy explains how we collect, use, store, and protect your
              information when you use our web application at{" "}
              <span className="font-medium text-gray-800 dark:text-zinc-200">
                jobpilot.app
              </span>{" "}
              (&quot;the Service&quot;). By using the Service, you agree to the terms
              described here.
            </p>
          </Section>

          <Section title="2. Information We Collect">
            <SubHeading>2.1 Account Information</SubHeading>
            <p>
              When you register, we collect your <strong>email address</strong> and a
              hashed version of your <strong>password</strong>. We never store your
              password in plain text.
            </p>
            <SubHeading>2.2 Resume &amp; Profile Data</SubHeading>
            <p>
              You may upload a master resume and fill in profile details (skills,
              preferences, target roles). This data is stored securely and used solely to
              power AI scoring features within your account.
            </p>
            <SubHeading>2.3 Job Pipeline Data</SubHeading>
            <p>
              Job postings fetched from external sources (RemoteOK, Greenhouse, ReliefWeb,
              etc.) are stored in association with your account so you can manage your
              pipeline. This data originates from publicly available job boards.
            </p>
            <SubHeading>2.4 Usage Data</SubHeading>
            <p>
              We may collect basic usage information such as pages visited, feature
              interactions, and timestamps to improve the product. We do not sell this
              data to third parties.
            </p>
          </Section>

          <Section title="3. How We Use Your Information">
            <ul>
              <li>To authenticate you and manage your account session securely</li>
              <li>To fetch, store, and display job postings relevant to your preferences</li>
              <li>
                To send your resume and job descriptions to AI providers (Google Gemini,
                Anthropic Claude, or OpenAI) for fit scoring — see Section 4
              </li>
              <li>To improve the reliability, performance, and features of the Service</li>
              <li>
                To communicate with you about important service changes (we do not send
                marketing emails without explicit consent)
              </li>
            </ul>
          </Section>

          <Section title="4. AI Processing &amp; Third-Party AI Providers">
            <p>
              JobPilot&apos;s AI scoring features send your resume content and job
              descriptions to third-party AI APIs. Depending on the AI engine you select
              when scoring a job, your data may be processed by:
            </p>
            <ul>
              <li>
                <strong>Google Gemini</strong> — governed by{" "}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-600 dark:text-violet-400 underline underline-offset-2"
                >
                  Google&apos;s Privacy Policy
                </a>
              </li>
              <li>
                <strong>Anthropic Claude</strong> — governed by{" "}
                <a
                  href="https://www.anthropic.com/legal/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-600 dark:text-violet-400 underline underline-offset-2"
                >
                  Anthropic&apos;s Privacy Policy
                </a>
              </li>
              <li>
                <strong>OpenAI</strong> — governed by{" "}
                <a
                  href="https://openai.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-600 dark:text-violet-400 underline underline-offset-2"
                >
                  OpenAI&apos;s Privacy Policy
                </a>
              </li>
            </ul>
            <p>
              We recommend reviewing each provider&apos;s policy. We use API access only
              and do not enable training on your data where providers offer such controls.
            </p>
          </Section>

          <Section title="5. Data Storage &amp; Security">
            <p>
              Your data is stored in a PostgreSQL database hosted on infrastructure with
              encrypted storage at rest and in transit (TLS). We apply industry-standard
              security practices including hashed passwords, session token rotation, and
              CSRF protection.
            </p>
            <p>
              While we take security seriously, no system is 100% secure. We encourage
              you to use a strong, unique password and to notify us immediately if you
              suspect unauthorized account access.
            </p>
          </Section>

          <Section title="6. Cookies &amp; Local Storage">
            <p>
              We use session cookies to keep you authenticated between visits. We also use
              browser local storage for theme preferences (light/dark mode) and locale
              settings. We do not use advertising cookies or track you across third-party
              websites.
            </p>
          </Section>

          <Section title="7. Third-Party Job Sources">
            <p>
              JobPilot fetches job listings from external platforms (ReliefWeb, RemoteOK,
              Greenhouse, Lever, Ashby, CongoJob, Emploi.cd, UNJobs). These platforms
              operate independently and have their own privacy policies. We only store the
              publicly available job listing data, not any personal data from those
              platforms.
            </p>
          </Section>

          <Section title="8. Your Rights">
            <p>Depending on your location, you may have the right to:</p>
            <ul>
              <li>
                <strong>Access</strong> the personal data we hold about you
              </li>
              <li>
                <strong>Correct</strong> inaccurate data
              </li>
              <li>
                <strong>Delete</strong> your account and associated data
              </li>
              <li>
                <strong>Export</strong> your data in a portable format
              </li>
              <li>
                <strong>Withdraw consent</strong> for AI processing at any time by not
                using the Score Job feature
              </li>
            </ul>
            <p>
              To exercise any of these rights, contact us at the email below.
            </p>
          </Section>

          <Section title="9. Data Retention">
            <p>
              We retain your account data for as long as your account is active. If you
              delete your account, your personal data (email, resume, profile) will be
              permanently deleted within 30 days. Job pipeline data you added may be
              retained in anonymized, aggregated form.
            </p>
          </Section>

          <Section title="10. Children's Privacy">
            <p>
              JobPilot is not intended for use by anyone under the age of 16. We do not
              knowingly collect personal data from children. If you believe a child has
              provided us with personal information, please contact us and we will delete
              it promptly.
            </p>
          </Section>

          <Section title="11. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. When we do, we will
              update the &quot;Last updated&quot; date at the top of this page. For
              significant changes, we will notify users via email or an in-app
              notification.
            </p>
          </Section>

          <Section title="12. Contact Us">
            <p>
              If you have any questions, requests, or concerns about this Privacy Policy
              or how we handle your data, please contact us:
            </p>
            <div className="mt-3 p-4 bg-white dark:bg-[#141417] border border-slate-200 dark:border-zinc-800 rounded-2xl text-sm">
              <p className="font-semibold text-gray-900 dark:text-slate-100">JobPilot</p>
              <p className="text-gray-500 dark:text-zinc-400">privacy@jobpilot.app</p>
            </div>
          </Section>
        </div>

        {/* Back link */}
        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-zinc-800">
          <Link
            href="/"
            className="text-sm text-violet-600 dark:text-violet-400 hover:underline underline-offset-2 font-medium transition-colors"
          >
            ← Back to JobPilot
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
