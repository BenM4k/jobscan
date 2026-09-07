import { ShieldCheck, Mail, Calendar } from "lucide-react";

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
    : "Active Member";

  return (
    <div className="bg-white dark:bg-[#121216] rounded-3xl border border-slate-200 dark:border-zinc-800/80 p-6 shadow-sm transition-all">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 pb-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-indigo-500 via-purple-500 to-pink-500 text-white font-black text-lg flex items-center justify-center uppercase shadow-md shadow-indigo-500/20">
            {initials}
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
              <span>{user.name || "Jobpilot User"}</span>
              <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
                PRO CANDIDATE
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
        <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-zinc-900/50 border border-slate-100 dark:border-zinc-800/60 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-gray-500 dark:text-zinc-400">Authentication</p>
            <p className="text-xs font-bold text-gray-900 dark:text-zinc-200">Verified & Encrypted</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-zinc-900/50 border border-slate-100 dark:border-zinc-800/60 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-gray-500 dark:text-zinc-400">Account Status</p>
            <p className="text-xs font-bold text-gray-900 dark:text-zinc-200">{createdDate}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
