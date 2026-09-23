"use client";

import React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Coins, Sparkles } from "lucide-react";

interface CreditBalanceIndicatorProps {
  balance: number;
  className?: string;
}

/** Shows the user's available credits and links to billing. */
export function CreditBalanceIndicator({
  balance,
  className = "",
}: CreditBalanceIndicatorProps) {
  const t = useTranslations("billing");
  const isLow = balance < 5;

  return (
    <Link
      href="/dashboard/billing"
      aria-label={t("balanceAriaLabel", { balance })}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-xs border ${
        isLow
          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
          : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20"
      } ${className}`}
    >
      <Coins className="size-3.5" />
      <span>{balance}</span>
      <span className="hidden sm:inline opacity-80 font-normal">
        {t("credits").toLowerCase()}
      </span>
      {isLow && <Sparkles className="size-3 text-amber-500 animate-pulse" />}
    </Link>
  );
}
