import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { DashboardFooter } from "@/components/layout/DashboardFooter";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — JobPilot",
  description:
    "Read JobPilot's Terms of Service to understand your rights and obligations when using our AI-powered job search automation platform.",
};

export const instant = false;

export default function TermsOfServicePage() {
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
            <span className="text-gray-600 dark:text-zinc-400">Terms of Service</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-medium text-gray-900 dark:text-slate-100 leading-tight tracking-tight">
            Terms of Service
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Last updated: {lastUpdated}
          </p>
        </div>

        {/* Content */}
        <div className="space-y-10">
          <Section title="1. Acceptance of Terms">
            <p>
              By accessing or using JobPilot (&quot;the Service&quot;), you agree to be
              bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to
              these Terms, please do not use the Service.
            </p>
          </Section>

          <Section title="2. Description of Service">
            <p>
              JobPilot is a personal job search automation tool that aggregates job
              postings from public sources, provides AI-powered fit scoring against your
              resume, and helps you manage your application pipeline.
            </p>
          </Section>

          <Section title="3. Account Registration">
            <p>
              You must register for an account to use most features of the Service. You
              are responsible for maintaining the confidentiality of your account
              credentials and for all activity that occurs under your account. You must
              provide accurate and complete information when registering.
            </p>
          </Section>

          <Section title="4. Acceptable Use">
            <p>You agree not to:</p>
            <ul>
              <li>Use the Service for any unlawful purpose or in violation of any regulations</li>
              <li>Attempt to reverse-engineer, scrape, or abuse the Service infrastructure</li>
              <li>
                Share your account credentials with others or create accounts on behalf of
                third parties without authorization
              </li>
              <li>
                Use the AI scoring features to process data belonging to third parties
                without their consent
              </li>
              <li>
                Attempt to circumvent rate limits or access controls implemented in the
                Service
              </li>
            </ul>
          </Section>

          <Section title="5. AI Features & Third-Party Services">
            <p>
              The AI scoring features rely on third-party AI APIs (Google Gemini, Anthropic
              Claude, OpenAI). By using these features, you acknowledge that your resume
              content and job descriptions will be transmitted to these providers under
              their respective terms. We are not responsible for the output accuracy of
              AI-generated scores and recommendations — they are advisory only.
            </p>
          </Section>

          <Section title="6. Intellectual Property">
            <p>
              The JobPilot application, its design, and underlying code are the intellectual
              property of JobPilot and its contributors. Job listing content displayed
              within the Service originates from third-party job boards and remains the
              property of their respective owners.
            </p>
            <p>
              You retain ownership of your resume and profile content. By uploading it, you
              grant JobPilot a limited, non-exclusive license to process it for the purpose
              of delivering the Service features to you.
            </p>
          </Section>

          <Section title="7. Disclaimer of Warranties">
            <p>
              The Service is provided &quot;as is&quot; without warranties of any kind,
              express or implied. We do not guarantee the accuracy, completeness, or
              availability of job listings, nor the accuracy of AI-generated fit scores.
              Job search outcomes depend on many factors outside our control.
            </p>
          </Section>

          <Section title="8. Limitation of Liability">
            <p>
              To the fullest extent permitted by law, JobPilot shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages arising
              from your use of the Service, including but not limited to loss of employment
              opportunities, data, or revenue.
            </p>
          </Section>

          <Section title="9. Termination">
            <p>
              We reserve the right to suspend or terminate your account at our discretion
              if you violate these Terms. You may delete your account at any time from
              your profile settings. Upon termination, your personal data will be handled
              as described in our Privacy Policy.
            </p>
          </Section>

          <Section title="10. Changes to Terms">
            <p>
              We may modify these Terms at any time. We will notify you of significant
              changes via email or in-app notification. Continued use of the Service after
              changes take effect constitutes acceptance of the revised Terms.
            </p>
          </Section>

          <Section title="11. Governing Law">
            <p>
              These Terms shall be governed by and construed in accordance with applicable
              laws. Any disputes shall be resolved through good-faith negotiation before
              pursuing formal legal remedies.
            </p>
          </Section>

          <Section title="12. Contact">
            <p>For questions about these Terms, contact us at:</p>
            <div className="mt-3 p-4 bg-white dark:bg-[#141417] border border-slate-200 dark:border-zinc-800 rounded-2xl text-sm">
              <p className="font-semibold text-gray-900 dark:text-slate-100">JobPilot</p>
              <p className="text-gray-500 dark:text-zinc-400">legal@jobpilot.app</p>
            </div>
          </Section>
        </div>

        {/* Back link */}
        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-zinc-800 flex flex-wrap gap-6">
          <Link
            href="/"
            className="text-sm text-violet-600 dark:text-violet-400 hover:underline underline-offset-2 font-medium transition-colors"
          >
            ← Back to JobPilot
          </Link>
          <Link
            href="/privacy"
            className="text-sm text-gray-500 dark:text-zinc-400 hover:underline underline-offset-2 transition-colors"
          >
            Privacy Policy →
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
      <div className="space-y-3 text-sm text-gray-600 dark:text-zinc-300 leading-relaxed [&_strong]:font-semibold [&_strong]:text-gray-800 [&_strong]:dark:text-zinc-100 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5">
        {children}
      </div>
    </section>
  );
}
