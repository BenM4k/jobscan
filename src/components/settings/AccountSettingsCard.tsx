import React from "react";
import { ShieldCheck, Mail, Calendar } from "lucide-react";
import { StatBox } from "@/components/shared/StatBox";

interface AccountSettingsCardProps {
  user: {
    id: string;
    email: string;
    name?: string | null;
    createdAt?: Date | string | null;
  };
}

export function AccountSettingsCard({ user }: AccountSettingsCardProps) {
  const initials = (user.name || user.email || "US").slice(0, 2).toUpperCase();
  const createdDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Active member";

  return (
    <div className="bg-white dark:bg-[#121216] rounded-2xl border border-slate-200 dark:border-zinc-800/80 p-6 shadow-2xs transition-all">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 pb-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-blue-600 text-white font-bold text-base sm:text-lg flex items-center justify-center uppercase shadow-xs shrink-0">
            {initials}
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
              <span>{user.name || "Jobpilot User"}</span>
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                Pro candidate
              </span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5">
              <Mail className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
              <span>{user.email}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
        <StatBox
          icon={<ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
          label="Authentication"
          value="Verified & encrypted"
        />
        <StatBox
          icon={<Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
          label="Account status"
          value={createdDate}
        />
      </div>
    </div>
  );
}
