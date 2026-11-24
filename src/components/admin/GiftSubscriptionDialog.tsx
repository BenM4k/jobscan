"use client";

import { useState, useTransition, useId } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { adminGiftSubscriptionAction } from "@/actions/admin-management.actions";
import { toast } from "sonner";
import { Gift, Loader2, Sparkles } from "lucide-react";

interface GiftSubscriptionDialogProps {
  user: {
    id: string;
    name: string;
    email: string;
    subscriptionStatus?: string | null;
    currentPeriodEnd?: Date | null;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_DURATIONS = [
  { label: "1 Month (30d)", days: 30 },
  { label: "3 Months (90d)", days: 90 },
  { label: "6 Months (180d)", days: 180 },
  { label: "1 Year (365d)", days: 365 },
];

export function GiftSubscriptionDialog({
  user,
  isOpen,
  onClose,
}: GiftSubscriptionDialogProps) {
  const router = useRouter();
  const durationInputId = useId();
  const reasonInputId = useId();
  const [durationDays, setDurationDays] = useState<number>(30);
  const [reason, setReason] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  if (!user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!durationDays || durationDays < 1 || durationDays > 730) {
      toast.error("Please enter a valid duration between 1 and 730 days");
      return;
    }
    if (reason.trim().length > 255) {
      toast.error("Reason / admin memo must be 255 characters or fewer");
      return;
    }

    startTransition(async () => {
      const res = await adminGiftSubscriptionAction(
        user.id,
        durationDays,
        reason.trim() || undefined
      );

      if (res.ok) {
        toast.success(
          `Gifted ${durationDays} days of Pro to ${user.name || user.email}`
        );
        onClose();
        setReason("");
        setDurationDays(30);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to gift subscription");
      }
    });
  };

  const isAlreadyActive = user.subscriptionStatus === "active";

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isPending) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <DialogTitle>Gift Pro Subscription</DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div>
            <p className="text-sm text-slate-500 dark:text-zinc-400">
              Target user:{" "}
              <span className="font-semibold text-slate-900 dark:text-white">
                {user.name || user.email}
              </span>
            </p>
            {isAlreadyActive && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 inline shrink-0" />
                User already has an active Pro subscription. Gifting will extend
                their current period.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-700 dark:text-zinc-300">
              Duration Presets
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_DURATIONS.map((preset) => (
                <button
                  key={preset.days}
                  type="button"
                  onClick={() => setDurationDays(preset.days)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border text-left transition-colors ${
                    durationDays === preset.days
                      ? "border-purple-600 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-500"
                      : "border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-700 dark:text-zinc-300"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor={durationInputId}
              className="text-xs font-medium text-slate-700 dark:text-zinc-300"
            >
              Custom Days (1 - 730)
            </label>
            <input
              id={durationInputId}
              type="number"
              min={1}
              max={730}
              value={durationDays}
              onChange={(e) => setDurationDays(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 dark:focus:ring-purple-400"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor={reasonInputId}
              className="text-xs font-medium text-slate-700 dark:text-zinc-300"
            >
              Reason / Admin Memo (Optional)
            </label>
            <input
              id={reasonInputId}
              type="text"
              maxLength={255}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. VIP promotion, community reward, support resolution"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 dark:focus:ring-purple-400"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || durationDays <= 0}
              className="bg-purple-600 hover:bg-purple-700 text-white dark:bg-purple-600 dark:hover:bg-purple-700"
            >
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm Gift
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

