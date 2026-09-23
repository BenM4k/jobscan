"use client";

import React from "react";
import { useTranslations, useFormatter } from "next-intl";
import { CreditLedgerSelect } from "@/dal/billing.dal";
import { History, ArrowDownRight, ArrowUpRight } from "lucide-react";

interface CreditLedgerHistoryProps {
  entries: CreditLedgerSelect[];
}

/** Displays the user's credit transactions in reverse chronological order. */
export function CreditLedgerHistory({ entries }: CreditLedgerHistoryProps) {
  const t = useTranslations("billing");
  const format = useFormatter();

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
    <section aria-labelledby="history-heading" className="space-y-6">
      {/* Section Header */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-md bg-muted text-muted-foreground flex items-center justify-center border border-border shrink-0">
            <History className="size-4" />
          </div>
          <h2
            id="history-heading"
            className="text-lg sm:text-xl font-bold text-foreground"
          >
            {t("historyTitle")}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground pl-10.5 max-w-xl leading-relaxed">
          {t("historySubtitle")}
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground rounded-xl border border-dashed border-border/70 bg-muted/10">
          {t("noHistory")}
        </div>
      ) : (
        <div className="space-y-3 pt-2">
          {entries.map((entry) => {
            const isPositive = entry.amount > 0;
            const dateStr = format.dateTime(new Date(entry.createdAt), {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "UTC",
            });

            return (
              <div
                key={entry.id}
                className="p-4 sm:p-4.5 rounded-xl border border-border/70 bg-card/60 hover:bg-muted/20 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`size-9 rounded-lg flex items-center justify-center shrink-0 border ${
                      isPositive
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {isPositive ? (
                      <ArrowDownRight className="size-4" />
                    ) : (
                      <ArrowUpRight className="size-4" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {getActionLabel(entry.action)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {dateStr}
                    </div>
                  </div>
                </div>

                <div className="sm:text-right pl-12 sm:pl-0 flex sm:flex-col items-center sm:items-end justify-between gap-1">
                  <div
                    className={`text-sm sm:text-base font-bold ${
                      isPositive
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-foreground"
                    }`}
                  >
                    {isPositive ? `+${entry.amount}` : entry.amount}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      {t("credits").toLowerCase()}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("balance")}:{" "}
                    <span className="font-semibold text-foreground">
                      {entry.balanceAfter}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

