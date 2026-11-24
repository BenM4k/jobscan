"use client";

import React, { useState, useEffect } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { History, Copy, Check, Loader2, AlertTriangle, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getDocumentVersionsAction } from "@/actions/job-history.actions";
import type { DocumentVersionItem } from "@/services/job-history.service";
import { toast } from "sonner";

interface DocumentVersionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelineEntryId: string;
  type: "resume" | "cover_letter";
  onRestore?: (content: string) => void;
}

/** Displays previously saved tailored resume or cover-letter versions in a shadcn Dialog. */
export function DocumentVersionHistoryDialog({
  open,
  onOpenChange,
  pipelineEntryId,
  type,
  onRestore,
}: DocumentVersionHistoryDialogProps) {
  const t = useTranslations("jobDetail");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const [versions, setVersions] = useState<DocumentVersionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !pipelineEntryId) return;
    let cancelled = false;

    const loadVersions = async () => {
      setLoadError(null);
      setIsLoading(true);
      try {
        const res = await getDocumentVersionsAction({ pipelineEntryId, type });
        if (cancelled) return;
        if (!res.success) {
          const message = res.error || t("versionHistoryLoadError");
          setVersions([]);
          setLoadError(message);
          toast.error(message);
          return;
        }
        setLoadError(null);
        setVersions(res.versions ?? []);
      } catch {
        if (!cancelled) {
          const message = t("versionHistoryLoadError");
          setVersions([]);
          setLoadError(message);
          toast.error(message);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadVersions();
    return () => {
      cancelled = true;
    };
  }, [open, pipelineEntryId, type, retryCount, t]);

  const handleCopy = async (id: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85dvh] overflow-y-auto bg-white dark:bg-[#121216] border-slate-200 dark:border-zinc-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-zinc-100">
            <History className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>
              {type === "resume"
                ? t("versionHistoryTitleResume")
                : t("versionHistoryTitleCoverLetter")}
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500 dark:text-zinc-400">
            {t("versionHistoryDescription")}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-xs text-muted-foreground gap-2">
            <Loader2 className="size-4 animate-spin" />
            <span>{tCommon("loading")}</span>
          </div>
        ) : loadError ? (
          <div
            role="alert"
            className="flex flex-col items-center justify-center gap-3 py-8 text-center"
          >
            <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
              <AlertTriangle className="size-4 shrink-0" />
              <span>{loadError}</span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setRetryCount((c) => c + 1)}
            >
              {t("versionHistoryRetry")}
            </Button>
          </div>
        ) : versions.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            {t("versionHistoryEmpty")}
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            {versions.map((ver, idx) => {
              const versionNum = versions.length - idx;
              return (
                <div
                  key={ver.id}
                  className="rounded-xl border border-slate-200 dark:border-zinc-800 p-4 space-y-2.5 bg-slate-50/60 dark:bg-zinc-900/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                        {t("versionLabel", { number: versionNum })}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {format.dateTime(new Date(ver.createdAt), {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {onRestore && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            onRestore(ver.content);
                            onOpenChange(false);
                          }}
                          className="h-7 px-2 text-xs gap-1 cursor-pointer"
                        >
                          <RotateCcw className="size-3.5" />
                          <span>{t("restoreVersion")}</span>
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => void handleCopy(ver.id, ver.content)}
                        className="h-7 px-2 text-xs gap-1 cursor-pointer"
                      >
                        {copiedId === ver.id ? (
                          <Check className="size-3.5" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                        <span>
                          {copiedId === ver.id ? tCommon("copied") : tCommon("copy")}
                        </span>
                      </Button>
                    </div>
                  </div>
                  <pre className="whitespace-pre-wrap text-xs text-gray-700 dark:text-zinc-300 font-sans leading-relaxed max-h-48 overflow-y-auto">
                    {ver.content}
                  </pre>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
