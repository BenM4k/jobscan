"use client";

import React, { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Shield, Trash2, Loader2 } from "lucide-react";
import { authClient } from "@/services/auth/auth-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SessionData } from "./session-utils";
import { SessionItem } from "./SessionItem";

interface SessionManagementCardProps {
  initialSessions: SessionData[];
  currentSessionToken?: string;
}

export function SessionManagementCard({
  initialSessions,
  currentSessionToken,
}: SessionManagementCardProps) {
  const t = useTranslations("settings");
  const [sessions, setSessions] = useState<SessionData[]>(initialSessions);
  const [revokingToken, setRevokingToken] = useState<string | null>(null);
  const [isRevokingOther, setIsRevokingOther] = useState(false);
  const [, startTransition] = useTransition();

  const handleRevokeSession = async (token: string) => {
    setRevokingToken(token);
    try {
      const res = await authClient.revokeSession({ token });
      if (res?.error) {
        toast.error(res.error.message || t("sessionRevokedError"));
      } else {
        toast.success(t("sessionRevokedSuccess"));
        startTransition(() => {
          setSessions((prev) => prev.filter((s) => s.token !== token));
        });
      }
    } catch {
      toast.error(t("sessionRevokedError"));
    } finally {
      setRevokingToken(null);
    }
  };

  const handleRevokeOtherSessions = async () => {
    setIsRevokingOther(true);
    try {
      const res = await authClient.revokeOtherSessions();
      if (res?.error) {
        toast.error(res.error.message || t("otherSessionsRevokedError"));
      } else {
        toast.success(t("otherSessionsRevokedSuccess"));
        startTransition(() => {
          setSessions((prev) =>
            currentSessionToken
              ? prev.filter((s) => s.token === currentSessionToken)
              : []
          );
        });
      }
    } catch {
      toast.error(t("otherSessionsRevokedError"));
    } finally {
      setIsRevokingOther(false);
    }
  };

  const otherSessionsCount = sessions.filter(
    (s) => s.token !== currentSessionToken
  ).length;

  return (
    <div className="bg-white dark:bg-[#121216] rounded-2xl border border-slate-200 dark:border-zinc-800/80 p-6 shadow-2xs transition-all space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-800/80 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-zinc-100">
              {t("sessionsTitle")}
            </h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              {t("sessionsSubtitle")}
            </p>
          </div>
        </div>
        {otherSessionsCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRevokeOtherSessions}
            disabled={isRevokingOther}
            className="text-xs font-semibold border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
          >
            {isRevokingOther ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
            ) : (
              <Trash2 className="w-3.5 h-3.5 mr-1" />
            )}
            {isRevokingOther ? t("revokingAll") : t("revokeAllOther")}
          </Button>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-6 text-gray-500 dark:text-zinc-400 text-xs">
          {t("noSessions")}
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-zinc-800/60">
          {sessions.map((item) => (
            <SessionItem
              key={item.id}
              item={item}
              isCurrent={item.token === currentSessionToken}
              isRevoking={revokingToken === item.token}
              onRevoke={handleRevokeSession}
            />
          ))}
        </div>
      )}
    </div>
  );
}
