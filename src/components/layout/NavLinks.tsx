"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { isNavActive } from "@/lib/nav";

export interface NavLinkItem {
  href: string;
  label: string;
  icon: string;
}

interface NavLinksProps {
  links?: NavLinkItem[];
}

/**
 * Renders the primary dashboard navigation links.
 * Defaults to localized routes so it can live directly inside the static layout shell.
 */
export function NavLinks({ links }: NavLinksProps) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const resolvedLinks: NavLinkItem[] = links ?? [
    { href: "/dashboard", label: t("pipeline"), icon: "📊" },
    { href: "/dashboard/resumes", label: t("resumes"), icon: "📄" },
    { href: "/dashboard/add-job", label: t("addJob"), icon: "➕" },
  ];

  return (
    <div
      className="flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/70 p-1 rounded-xl border border-slate-300 dark:border-slate-700/60"
    >
      {resolvedLinks.map((link) => {
        const isActive = isNavActive(link.href, pathname);
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
  );
}
