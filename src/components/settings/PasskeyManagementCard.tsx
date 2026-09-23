"use client";

import React, { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Fingerprint, Key, Trash2, Plus, Loader2, ShieldCheck } from "lucide-react";
import { authClient } from "@/services/auth/auth-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export interface PasskeyItem {
  id: string;
  name?: string | null;
  createdAt?: Date | string | null;
  deviceType?: string | null;
  aaguid?: string | null;
}

interface PasskeyManagementCardProps {
  initialPasskeys?: PasskeyItem[];
}

export function PasskeyManagementCard({
  initialPasskeys = [],
}: PasskeyManagementCardProps) {
  const t = useTranslations("settings");
  const [passkeys, setPasskeys] = useState<PasskeyItem[]>(initialPasskeys);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const handleAddPasskey = async () => {
    const defaultName =
      typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.userAgent)
        ? "Apple Touch ID / Face ID"
        : typeof navigator !== "undefined" && /Windows/i.test(navigator.userAgent)
        ? "Windows Hello"
        : "Security Key";

    const name = window.prompt(t("passkeyNamePrompt"), defaultName);
    if (name === null) return; // cancelled

    setIsAdding(true);
    try {
      const res = await authClient.passkey.addPasskey({
        name: name.trim() || defaultName,
      });

      if (res?.error) {
        toast.error(res.error.message || t("passkeyAddedError"));
      } else {
        toast.success(t("passkeyAddedSuccess"));
        const refreshed = await authClient.passkey.listUserPasskeys();
        if (refreshed.data) {
          startTransition(() => {
            setPasskeys(refreshed.data as unknown as PasskeyItem[]);
          });
        }
      }
    } catch {
      toast.error(t("passkeyAddedError"));
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeletePasskey = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await authClient.passkey.deletePasskey({ id });
      if (res?.error) {
        toast.error(res.error.message || t("passkeyDeletedError"));
      } else {
        toast.success(t("passkeyDeletedSuccess"));
        startTransition(() => {
          setPasskeys((prev) => prev.filter((p) => p.id !== id));
        });
      }
    } catch {
      toast.error(t("passkeyDeletedError"));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-[#121216] rounded-2xl border border-slate-200 dark:border-zinc-800/80 p-6 shadow-2xs transition-all space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-800/80 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Fingerprint className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-zinc-100">
              {t("passkeysTitle")}
            </h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              {t("passkeysSubtitle")}
            </p>
          </div>
        </div>
        <Button
          onClick={handleAddPasskey}
          disabled={isAdding}
          size="sm"
          className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
        >
          {isAdding ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
          ) : (
            <Plus className="w-3.5 h-3.5 mr-1" />
          )}
          {isAdding ? t("addingPasskey") : t("addPasskey")}
        </Button>
      </div>

      {passkeys.length === 0 ? (
        <div className="text-center py-6 text-gray-500 dark:text-zinc-400 text-xs">
          {t("noPasskeys")}
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-zinc-800/60">
          {passkeys.map((p) => {
            const createdFormatted = p.createdAt
              ? new Date(p.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "Registered";

            return (
              <div
                key={p.id}
                className="py-4 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                        {p.name || "Passkey"}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                        <ShieldCheck className="w-3 h-3 text-emerald-500" />
                        <span>FIDO2 / WebAuthn</span>
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                      {t("created")}: {createdFormatted}
                    </p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeletePasskey(p.id)}
                  disabled={deletingId === p.id}
                  className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 cursor-pointer"
                >
                  {deletingId === p.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline ml-1">{t("deletePasskey")}</span>
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
