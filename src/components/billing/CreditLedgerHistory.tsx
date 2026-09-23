"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { CreditLedgerSelect } from "@/dal/billing.dal";
import { History, ArrowDownRight, ArrowUpRight } from "lucide-react";

interface CreditLedgerHistoryProps {
  entries: CreditLedgerSelect[];
}

export function CreditLedgerHistory({ entries }: CreditLedgerHistoryProps) {
  const t = useTranslations("billing");

  const getActionLabel = (action: string) => {
    switch (action) {
      case "purchase":
        return t("actionPurchase");
      case "signup_grant":
        return t("actionSignupGrant");
      case "tailored_resume":
        return t("actionTailoredResume");
      case "tailored_cover_letter":
        return t("actionTailoredCoverLetter");
      case "interview_prep":
        return t("actionInterviewPrep");
      case "refund":
        return t("actionRefund");
      default:
        return action;
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-6 shadow-xs">
      <div className="flex items-center gap-3 mb-4">
        <div className="size-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center">
          <History className="size-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">
            {t("historyTitle")}
          </h2>
          <p className="text-xs text-muted-foreground">{t("historySubtitle")}</p>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted-foreground">
          {t("noHistory")}
        </div>
      ) : (
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
          {entries.map((entry) => {
            const isPositive = entry.amount > 0;
            const dateStr = new Date(entry.createdAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={entry.id}
                className="py-3 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`size-7 rounded-lg flex items-center justify-center ${
                      isPositive
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    {isPositive ? (
                      <ArrowDownRight className="size-3.5" />
                    ) : (
                      <ArrowUpRight className="size-3.5" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-foreground">
                      {getActionLabel(entry.action)}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {dateStr}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`font-semibold ${
                      isPositive
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-foreground"
                    }`}
                  >
                    {isPositive ? `+${entry.amount}` : entry.amount} credits
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Balance: {entry.balanceAfter}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
