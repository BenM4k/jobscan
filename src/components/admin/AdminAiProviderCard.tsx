"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bot, Check, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  listAiProviderModelsAction,
  setGlobalAiProviderAction,
} from "@/actions/admin.actions";
import type { GlobalAiProvider } from "@/services/ai/provider-config";
import type { ProviderModelCatalog } from "@/services/ai/model-catalog";
import { AdminAiModelSelector } from "./AdminAiModelSelector";

interface AdminAiProviderCardProps {
  currentProvider: GlobalAiProvider;
  currentModelsByProvider: Record<GlobalAiProvider, string>;
  initialCatalog: ProviderModelCatalog;
  configuredProviders: Record<GlobalAiProvider, boolean>;
}

const PROVIDER_LABELS: ReadonlyArray<{ id: GlobalAiProvider; label: string }> = [
  { id: "gemini", label: "Google Gemini" },
  { id: "claude", label: "Anthropic Claude" },
  { id: "openai", label: "OpenAI" },
  { id: "gateway", label: "AI Gateway" },
];

/** Admin-only selector for the application-wide AI provider and model. */
export function AdminAiProviderCard({
  currentProvider,
  currentModelsByProvider,
  initialCatalog,
  configuredProviders,
}: AdminAiProviderCardProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<GlobalAiProvider>(currentProvider);
  const [active, setActive] = useState<GlobalAiProvider>(currentProvider);
  const [selectedModels, setSelectedModels] = useState<
    Record<GlobalAiProvider, string>
  >(currentModelsByProvider);
  const [activeModels, setActiveModels] = useState<
    Record<GlobalAiProvider, string>
  >(currentModelsByProvider);
  const [catalogByProvider, setCatalogByProvider] = useState<
    Partial<Record<GlobalAiProvider, ProviderModelCatalog>>
  >({ [initialCatalog.provider]: initialCatalog });
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selectedModel = selectedModels[selected] || "";
  const activeCatalog = catalogByProvider[selected];
  const hasChanges =
    selected !== active || selectedModel.trim() !== activeModels[active];

  const loadModels = async (provider: GlobalAiProvider, forceRefresh = false) => {
    setIsLoadingModels(true);
    try {
      const res = await listAiProviderModelsAction(provider, forceRefresh);
      if (res.ok) {
        setCatalogByProvider((prev) => ({ ...prev, [provider]: res.value }));
        if (forceRefresh) {
          toast.success(`Refreshed ${provider} model list`);
        }
      } else if (forceRefresh) {
        toast.error(res.error || "Failed to refresh models");
      }
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleSelectProvider = (nextProvider: GlobalAiProvider) => {
    setSelected(nextProvider);
    if (!catalogByProvider[nextProvider]) {
      void loadModels(nextProvider, false);
    }
  };

  const handleSave = () => {
    const trimmedModel = selectedModel.trim();
    if (!trimmedModel) {
      toast.error("Please select or enter a valid model ID");
      return;
    }

    startTransition(async () => {
      const res = await setGlobalAiProviderAction(selected, trimmedModel);
      if (!res.ok) {
        toast.error(res.error || "Failed to update global AI configuration");
        return;
      }
      setActive(res.value.provider);
      setActiveModels((prev) => ({
        ...prev,
        [res.value.provider]: res.value.modelId,
      }));
      toast.success(
        `Global AI updated to ${res.value.provider} (${res.value.modelId})`
      );
      router.refresh();
    });
  };

  return (
    <div className="p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <Bot className="w-4 h-4 text-purple-500" />
            <span>Global AI Provider & Model</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Controls which AI provider and model power scoring, extraction,
            tailoring, and interview prep for all users.
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          disabled={
            isPending ||
            !hasChanges ||
            !configuredProviders[selected] ||
            !selectedModel.trim()
          }
          onClick={handleSave}
          className="shrink-0 cursor-pointer"
        >
          {isPending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              Saving...
            </>
          ) : (
            "Apply Globally"
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {PROVIDER_LABELS.map((item) => {
          const isSelected = selected === item.id;
          const isActive = active === item.id;
          const isConfigured = configuredProviders[item.id];
          const savedModel = selectedModels[item.id];

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectProvider(item.id)}
              aria-pressed={isSelected}
              className={`text-left p-3.5 rounded-xl border transition-colors cursor-pointer ${
                isSelected
                  ? "border-purple-500 bg-purple-50/70 dark:bg-purple-950/30 ring-1 ring-purple-500/40"
                  : "border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-900 dark:text-zinc-100">
                  {item.label}
                </span>
                {isActive && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                    <Check className="w-2.5 h-2.5" />
                    Active
                  </span>
                )}
              </div>

              <p className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 mt-1 truncate">
                {savedModel}
              </p>

              <div className="mt-2.5 flex items-center gap-1 text-[10px] font-medium">
                {isConfigured ? (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Key configured
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-3 h-3" />
                    Missing API key
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <AdminAiModelSelector
        selectedModel={selectedModel}
        models={activeCatalog?.models || []}
        catalogSource={activeCatalog?.source || "fallback"}
        isLoadingModels={isLoadingModels}
        onSelectModel={(modelId) =>
          setSelectedModels((prev) => ({ ...prev, [selected]: modelId }))
        }
        onRefreshModels={() => void loadModels(selected, true)}
      />
    </div>
  );
}
