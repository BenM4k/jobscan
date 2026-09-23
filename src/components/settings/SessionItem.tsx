"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Laptop, Smartphone, Globe, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SessionData, parseUserAgent } from "./session-utils";

interface SessionItemProps {
  item: SessionData;
  isCurrent: boolean;
  isRevoking: boolean;
  onRevoke: (token: string) => void;
}

export function SessionItem({
  item,
  isCurrent,
  isRevoking,
  onRevoke,
}: SessionItemProps) {
  const t = useTranslations("settings");
  const { device, browser, isMobile } = parseUserAgent(item.userAgent);
  const createdFormatted = new Date(item.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 flex items-center justify-center shrink-0">
          {isMobile ? <Smartphone className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
              {browser} on {device}
            </span>
            {isCurrent ? (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                {t("currentDevice")}
              </span>
            ) : (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                {t("activeDevice")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
            <span className="flex items-center gap-1">
              <Globe className="w-3 h-3 text-gray-400 dark:text-zinc-500" />
              {item.ipAddress || t("unknownIp")}
            </span>
            <span>•</span>
            <span suppressHydrationWarning>
              {t("created")}: {createdFormatted}
            </span>
          </div>
        </div>
      </div>

      {!isCurrent && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRevoke(item.token)}
          disabled={isRevoking}
          className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 self-start sm:self-center cursor-pointer"
        >
          {isRevoking ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            t("revoke")
          )}
        </Button>
      )}
    </div>
  );
}
