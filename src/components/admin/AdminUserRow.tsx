"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminUserListItem } from "@/dal/admin.dal";
import { Button } from "@/components/ui/button";
import { changeUserRoleAction } from "@/actions/admin-management.actions";
import { toast } from "sonner";
import {
  ShieldCheck,
  ShieldAlert,
  Coins,
  Ban,
  RotateCcw,
  Loader2,
  Gift,
  Sparkles,
} from "lucide-react";

export type AdminUserDialogType = "credits" | "gift" | "ban";

interface AdminUserRowProps {
  user: AdminUserListItem;
  onOpenDialog: (type: AdminUserDialogType, user: AdminUserListItem) => void;
}

export function AdminUserRow({ user, onOpenDialog }: AdminUserRowProps) {
  const router = useRouter();
  const [isRolePending, startRoleTransition] = useTransition();

  const handleRoleToggle = () => {
    const nextRole = user.role === "admin" ? "user" : "admin";
    startRoleTransition(async () => {
      const res = await changeUserRoleAction(user.id, nextRole);
      if (res.ok) {
        toast.success(`Updated ${user.name || user.email} role to ${nextRole}`);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update role");
      }
    });
  };

  return (
    <tr className="border-b border-slate-100 dark:border-zinc-800/60 hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors">
      <td className="py-3.5 pl-4 pr-3 text-sm">
        <div className="font-medium text-slate-900 dark:text-white">
          {user.name || "Unnamed"}
        </div>
        <div className="text-xs text-slate-500 dark:text-zinc-400">
          {user.email}
        </div>
      </td>

      <td className="px-3 py-3.5 text-sm">
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
            user.role === "admin"
              ? "bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50"
              : "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300"
          }`}
        >
          {user.role === "admin" && <ShieldCheck className="w-3 h-3" />}
          {user.role}
        </span>
      </td>

      <td className="px-3 py-3.5 text-sm font-semibold text-slate-900 dark:text-white">
        {user.creditBalance}
      </td>

      <td className="px-3 py-3.5 text-sm">
        {user.subscriptionStatus === "active" ? (
          <div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
              <Sparkles className="w-3 h-3" />
              Pro Active
            </span>
            {user.currentPeriodEnd && (
              <div className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">
                until {new Date(user.currentPeriodEnd).toLocaleDateString()}
              </div>
            )}
          </div>
        ) : (
          <span className="text-xs text-slate-400 dark:text-zinc-500">Free</span>
        )}
      </td>

      <td className="px-3 py-3.5 text-sm">
        {user.banned ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400">
            <ShieldAlert className="w-3 h-3" />
            Banned
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
            Active
          </span>
        )}
      </td>

      <td className="py-3.5 pl-3 pr-4 text-right text-sm">
        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2 text-xs"
            onClick={() => onOpenDialog("credits", user)}
            title="Grant credits"
          >
            <Coins className="w-3.5 h-3.5 mr-1 text-amber-500" />
            Credits
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2 text-xs"
            onClick={() => onOpenDialog("gift", user)}
            title="Gift Pro subscription"
          >
            <Gift className="w-3.5 h-3.5 mr-1 text-purple-600 dark:text-purple-400" />
            Gift Sub
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2 text-xs"
            onClick={handleRoleToggle}
            disabled={isRolePending}
            title={user.role === "admin" ? "Demote to user" : "Promote to admin"}
          >
            {isRolePending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            )}
            <span className="ml-1 hidden sm:inline">
              {user.role === "admin" ? "Demote" : "Make Admin"}
            </span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            className={`h-8 px-2 text-xs ${
              user.banned
                ? "text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                : "text-red-600 hover:text-red-700 dark:text-red-400"
            }`}
            onClick={() => onOpenDialog("ban", user)}
            title={user.banned ? "Unban user" : "Ban user"}
          >
            {user.banned ? (
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
            ) : (
              <Ban className="w-3.5 h-3.5 mr-1" />
            )}
            <span className="hidden sm:inline">
              {user.banned ? "Unban" : "Ban"}
            </span>
          </Button>
        </div>
      </td>
    </tr>
  );
}
