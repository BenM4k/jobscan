"use client";

import React, { useTransition, useState } from "react";
import { Bell, Mail, Clock } from "lucide-react";
import { updateDigestPreferencesAction } from "@/actions/settings.actions";
import { toast } from "sonner";
import type { UserPreferencesData } from "@/dal/growth.dal";

interface NotificationPreferencesCardProps {
  initialPreferences: UserPreferencesData;
}

export function NotificationPreferencesCard({
  initialPreferences,
}: NotificationPreferencesCardProps) {
  const [enabled, setEnabled] = useState(initialPreferences.digestEmailEnabled);
  const [frequency, setFrequency] = useState<"daily" | "weekly">(
    initialPreferences.digestEmailFrequency
  );
  const [isPending, startTransition] = useTransition();

  const handleToggleEnabled = () => {
    const nextEnabled = !enabled;
    setEnabled(nextEnabled);

    startTransition(async () => {
      const res = await updateDigestPreferencesAction(nextEnabled, frequency);
      if (!res.success) {
        toast.error(res.error || "Failed to update notification settings");
        setEnabled(enabled);
      } else {
        toast.success(
          nextEnabled
            ? "Opportunity digest emails enabled"
            : "Opportunity digest emails disabled"
        );
      }
    });
  };

  const handleChangeFrequency = (nextFreq: "daily" | "weekly") => {
    if (nextFreq === frequency) return;
    setFrequency(nextFreq);

    startTransition(async () => {
      const res = await updateDigestPreferencesAction(enabled, nextFreq);
      if (!res.success) {
        toast.error(res.error || "Failed to update digest frequency");
        setFrequency(frequency);
      } else {
        toast.success(`Digest frequency set to ${nextFreq}`);
      }
    });
  };

  return (
    <div className="bg-white dark:bg-[#121216] rounded-3xl border border-slate-200 dark:border-zinc-800/80 p-6 shadow-sm transition-all">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 pb-5">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
            <Bell className="w-4 h-4 text-purple-500" />
            <span>Opportunity Digests & Email Alerts</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
            Receive automated email digests featuring top scored roles tailored to your master resume.
          </p>
        </div>
      </div>

      <div className="space-y-5 mt-5">
        {/* Enable / Disable Digest */}
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-bold text-gray-900 dark:text-zinc-200 flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
              <span>Personalized Opportunity Digest</span>
            </p>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              Summarizes freshly scraped listings that match your skills profile.
            </p>
          </div>

          <button
            type="button"
            onClick={handleToggleEnabled}
            disabled={isPending}
            aria-pressed={enabled}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus-visible:ring-2 focus-visible:ring-purple-600 ${
              enabled
                ? "bg-purple-600 dark:bg-purple-500"
                : "bg-slate-200 dark:bg-zinc-800"
            } ${isPending ? "opacity-60" : ""}`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Frequency Picker */}
        {enabled && (
          <div className="pt-4 border-t border-slate-100 dark:border-zinc-800/60 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-bold text-gray-900 dark:text-zinc-200 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
                <span>Delivery Frequency</span>
              </p>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                Choose how often Inngest compiles and dispatches your digest.
              </p>
            </div>

            <div className="inline-flex p-1 bg-slate-100 dark:bg-zinc-900 rounded-xl border border-slate-200/80 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => handleChangeFrequency("daily")}
                disabled={isPending}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  frequency === "daily"
                    ? "bg-white dark:bg-zinc-800 text-purple-600 dark:text-purple-400 shadow-xs"
                    : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => handleChangeFrequency("weekly")}
                disabled={isPending}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  frequency === "weekly"
                    ? "bg-white dark:bg-zinc-800 text-purple-600 dark:text-purple-400 shadow-xs"
                    : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Weekly
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
