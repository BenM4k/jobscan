"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavLinkItem {
  href: string;
  label: string;
  icon: string;
}

interface NavLinksProps {
  links: NavLinkItem[];
}

export function NavLinks({ links }: NavLinksProps) {
  const pathname = usePathname();

  return (
    <div
      role="navigation"
      aria-label="Dashboard sections"
      className="flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/70 p-1 rounded-xl border border-slate-300 dark:border-slate-700/60"
    >
      {links.map((link) => {
        const isActive =
          link.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname === link.href || pathname?.startsWith(link.href + "/");
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
