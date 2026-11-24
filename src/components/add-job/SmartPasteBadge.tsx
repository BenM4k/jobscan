"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { SmartPasteKind } from "@/services/job-import/schema";
import { FileJson, Link2, Sparkles } from "lucide-react";

/** Live indicator showing what input type Smart Paste detected and its credit cost. */
export function SmartPasteBadge({ kind }: { kind: SmartPasteKind }) {
  const t = useTranslations("addJob.import");
  if (kind === "empty") return null;

  const badgeMap: Record<
    Exclude<SmartPasteKind, "empty">,
    { label: string; icon: React.ReactNode; className: string }
  > = {
    json: {
      label: t("badgeJsonFree"),
      icon: <FileJson className="size-3" />,
      className:
        "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    },
    url: {
      label: t("badgeUrlHint"),
      icon: <Link2 className="size-3" />,
      className:
        "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    },
    text: {
      label: t("badgeTextCost"),
      icon: <Sparkles className="size-3" />,
      className:
        "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    },
  };

  const active = badgeMap[kind];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full border",
        active.className
      )}
    >
      {active.icon}
      <span>{active.label}</span>
    </span>
  );
}
