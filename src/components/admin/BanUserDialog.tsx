"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { changeUserBanAction } from "@/actions/admin-management.actions";
import { toast } from "sonner";
import { ShieldAlert, ShieldCheck, Loader2 } from "lucide-react";

interface BanUserDialogProps {
  user: { id: string; name: string; email: string; banned: boolean } | null;
  isOpen: boolean;
  onClose: () => void;
}

export function BanUserDialog({
  user,
  isOpen,
  onClose,
}: BanUserDialogProps) {
  const [reason, setReason] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  if (!user) return null;

  const isBanning = !user.banned;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      const res = await changeUserBanAction(user.id, isBanning, reason);
      if (res.ok) {
        toast.success(
          isBanning
            ? `Banned user ${user.name || user.email}`
            : `Unbanned user ${user.name || user.email}`
        );
        onClose();
        setReason("");
      } else {
        toast.error(res.error || "Failed to update ban status");
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {isBanning ? (
              <ShieldAlert className="w-5 h-5 text-red-500" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
            )}
            <DialogTitle>
              {isBanning ? "Ban User Account" : "Unban User Account"}
            </DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <p className="text-sm text-slate-500 dark:text-zinc-400">
            {isBanning
              ? `Are you sure you want to ban ${user.name || user.email}? The user will be prevented from signing in or accessing the application.`
              : `Are you sure you want to restore access for ${user.name || user.email}?`}
          </p>

          {isBanning && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                Ban Reason
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Terms of service violation, abusive behavior"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                required
              />
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant={isBanning ? "destructive" : "default"}
              disabled={isPending}
            >
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isBanning ? "Confirm Ban" : "Confirm Unban"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
