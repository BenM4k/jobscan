"use cache";

import Link from "next/link";
import { Logo } from "@/components/Logo";

export async function DashboardFooter() {
  const currentYear = new Date().getFullYear();

  const legalLinks = [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms of Service" },
  ];

  const productLinks = [
    { href: "/dashboard", label: "Pipeline" },
    { href: "/dashboard/add-job", label: "Add Job" },
    { href: "/dashboard/profile", label: "Profile" },
  ];

  return (
    <footer
      aria-label="Site footer"
      className="border-t border-slate-200 dark:border-zinc-800 bg-white/60 dark:bg-[#0A0A0C]/60 backdrop-blur-sm mt-16"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
          {/* Brand column */}
          <div className="space-y-3">
            <Link
              href="/"
              aria-label="JobPilot Home"
              className="inline-flex group"
            >
              <Logo size={28} showText />
            </Link>
            <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed max-w-56">
              Personal job search automation powered by AI. Discover, score, and
              apply to the right roles faster.
            </p>
          </div>

          {/* Product links column */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-900 dark:text-slate-100 uppercase tracking-wider">
              Product
            </h3>
            <ul className="space-y-2">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-xs text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-slate-100 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal links column */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-900 dark:text-slate-100 uppercase tracking-wider">
              Legal
            </h3>
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-xs text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-slate-100 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-slate-200 dark:border-zinc-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-gray-400 dark:text-zinc-500">
            © {currentYear} JobPilot. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[11px] text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
