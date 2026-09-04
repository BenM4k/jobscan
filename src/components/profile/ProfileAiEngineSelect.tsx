"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { CardGridSelect } from "@/components/ui/card-grid-select";

interface ProfileAiEngineSelectProps {
  aiProvider: string;
  onAiProviderChange: (provider: string) => void;
}

export function ProfileAiEngineSelect({
  aiProvider,
  onAiProviderChange,
}: ProfileAiEngineSelectProps) {
  const t = useTranslations("profile");

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
          {t("defaultAiEngine")}
        </h3>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
          {t("defaultAiSubtitle")}
        </p>
      </div>

      <div className="self-start sm:self-auto">
        <CardGridSelect
          title="AI ENGINE"
          value={aiProvider}
          options={[
            { id: "gemini", label: "GEMINI 3.6 FLASH" },
            { id: "gateway", label: "GATEWAY" },
            { id: "openai", label: "OPENAI" },
            { id: "claude", label: "CLAUDE" },
          ]}
          onChange={onAiProviderChange}
          accentColor="indigo"
        />
      </div>
    </div>
  );
}
