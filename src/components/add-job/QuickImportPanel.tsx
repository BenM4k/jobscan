"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  extractJobFromFileAction,
  extractJobFromInputAction,
  type JobImportActionResponse,
} from "@/actions/job-import.actions";
import { InsufficientCreditsDialog } from "@/components/billing/InsufficientCreditsDialog";
import { Button } from "@/components/ui/button";
import {
  detectSmartPasteType,
  type ExtractedJobResult,
} from "@/services/job-import/schema";
import { SmartPasteBadge } from "./SmartPasteBadge";
import { FileText, Loader2, Sparkles, Upload } from "lucide-react";

const MAX_CLIENT_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt"];

interface QuickImportPanelProps {
  onImportStart?: () => void;
  onImported: (result: ExtractedJobResult) => void;
}

/** Smart Paste (URL / JSON / Raw Text) + PDF/DOCX file importer with toast notifications. */
export function QuickImportPanel({
  onImportStart,
  onImported,
}: QuickImportPanelProps) {
  const t = useTranslations("addJob.import");
  const router = useRouter();

  const [rawInput, setRawInput] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [creditsDialog, setCreditsDialog] = useState({
    open: false,
    requiredCost: 1,
    currentBalance: 0,
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);
  const fileIdempotencyRef = useRef<{ signature: string; key: string } | null>(
    null
  );
  const detectedKind = detectSmartPasteType(rawInput);

  const handleExtractionResponse = (
    res: JobImportActionResponse,
    source: "smart" | "file"
  ) => {
    if (!res.success) {
      if (res.code === "result_expired") {
        if (source === "smart") {
          idempotencyKeyRef.current = null;
        } else {
          fileIdempotencyRef.current = null;
        }
        toast.error(res.error || t("extractionFailed"), { duration: 5000 });
      } else if (res.code === "insufficient_credits") {
        setCreditsDialog({
          open: true,
          requiredCost: res.details?.requiredCost ?? 1,
          currentBalance: res.details?.currentBalance ?? 0,
        });
        toast.error(res.error);
      } else if (res.code === "url_fetch_failed") {
        toast.error(t("urlBlockedFallback"), { duration: 6000 });
      } else {
        toast.error(res.error || t("extractionFailed"), { duration: 5000 });
      }
      return;
    }

    if (source === "smart") {
      idempotencyKeyRef.current = null;
    } else {
      fileIdempotencyRef.current = null;
    }
    onImported(res.data);
    toast.success(
      res.data.creditsUsed > 0
        ? t("successAi", { credits: res.data.creditsUsed })
        : t("successFree")
    );
    if (res.data.creditsUsed > 0) {
      router.refresh();
    }
  };

  const handleSmartExtract = async () => {
    if (!rawInput.trim() || isExtracting) return;
    setIsExtracting(true);
    onImportStart?.();

    try {
      const key = (idempotencyKeyRef.current ??= crypto.randomUUID());
      const res = await extractJobFromInputAction({
        rawInput,
        idempotencyKey: key,
      });
      handleExtractionResponse(res, "smart");
    } catch {
      toast.error(t("unexpectedError"));
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || isExtracting) return;

    const lowerName = file.name.toLowerCase();
    if (!ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) {
      toast.error(t("unsupportedFile"));
      return;
    }
    if (file.size > MAX_CLIENT_FILE_BYTES) {
      toast.error(t("fileTooLarge"));
      return;
    }

    setIsExtracting(true);
    onImportStart?.();

    const signature = `${file.name}:${file.size}:${file.lastModified}`;
    try {
      const key =
        fileIdempotencyRef.current?.signature === signature
          ? fileIdempotencyRef.current.key
          : crypto.randomUUID();
      fileIdempotencyRef.current = { signature, key };

      const formData = new FormData();
      formData.append("file", file);
      formData.append("idempotencyKey", key);
      const res = await extractJobFromFileAction(formData);
      handleExtractionResponse(res, "file");
    } catch {
      toast.error(t("unexpectedError"));
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/50 p-4 sm:p-5 space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
              {t("title")}
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            {t("subtitle")}
          </p>
        </div>
        <SmartPasteBadge kind={detectedKind} />
      </div>

      <textarea
        rows={3}
        value={rawInput}
        disabled={isExtracting}
        onChange={(e) => {
          setRawInput(e.target.value);
          idempotencyKeyRef.current = null;
        }}
        placeholder={t("pastePlaceholder")}
        className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2.5 text-sm text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition resize-y"
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc,.txt"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isExtracting}
            onClick={() => fileInputRef.current?.click()}
            className="gap-1.5 text-xs cursor-pointer"
          >
            <Upload className="size-3.5" />
            <span>{t("uploadButton")}</span>
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
              ({t("badgeFileCost")})
            </span>
          </Button>
          <span className="text-[11px] text-slate-500 dark:text-zinc-400 inline-flex items-center gap-1">
            <FileText className="size-3" />
            {t("uploadHint")}
          </span>
        </div>

        <Button
          type="button"
          size="sm"
          disabled={isExtracting || !rawInput.trim()}
          onClick={handleSmartExtract}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 text-xs cursor-pointer"
        >
          {isExtracting ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              <span>{t("extracting")}</span>
            </>
          ) : (
            <>
              <Sparkles className="size-3.5" />
              <span>{t("extractButton")}</span>
            </>
          )}
        </Button>
      </div>

      <InsufficientCreditsDialog
        open={creditsDialog.open}
        onOpenChange={(open) => setCreditsDialog((prev) => ({ ...prev, open }))}
        requiredCost={creditsDialog.requiredCost}
        currentBalance={creditsDialog.currentBalance}
      />
    </section>
  );
}
