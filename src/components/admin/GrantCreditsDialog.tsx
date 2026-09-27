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
import { adminGrantCreditsAction } from "@/actions/admin-management.actions";
import { toast } from "sonner";
import { Coins, Loader2 } from "lucide-react";

interface GrantCreditsDialogProps {
  user: { id: string; name: string; email: string } | null;
  isOpen: boolean;
  onClose: () => void;
}

export function GrantCreditsDialog({
  user,
  isOpen,
  onClose,
}: GrantCreditsDialogProps) {
  const [amount, setAmount] = useState<number>(10);
  const [reason, setReason] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  if (!user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid credit amount");
      return;
    }

    startTransition(async () => {
      const res = await adminGrantCreditsAction(user.id, amount, reason);
      if (res.ok) {
        toast.success(`Granted ${amount} credits to ${user.name || user.email}`);
        onClose();
        setReason("");
      } else {
        toast.error(res.error || "Failed to grant credits");
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-500" />
            <DialogTitle>Grant Credits</DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div>
            <p className="text-sm text-slate-500 dark:text-zinc-400">
              Granting credits to <span className="font-semibold text-slate-900 dark:text-white">{user.name || user.email}</span>
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-zinc-300">
              Credit Amount
            </label>
            <input
              type="number"
              min={1}
              max={10000}
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-zinc-300">
              Reason / Memo (Optional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. VIP onboarding bonus, compensation"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || amount <= 0}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm Grant
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
