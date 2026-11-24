"use client";

import { useState } from "react";
import { Check, ChevronDown, Pencil, RefreshCw } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { AiModelOption } from "@/services/ai/model-catalog";

interface AdminAiModelSelectorProps {
  selectedModel: string;
  models: AiModelOption[];
  catalogSource: "live" | "fallback";
  isLoadingModels: boolean;
  onSelectModel: (modelId: string) => void;
  onRefreshModels: () => void;
}

function formatTokenLimit(limit?: number): string | null {
  if (!limit || limit <= 0) return null;
  if (limit >= 1_000_000) return `${Math.round((limit / 1_000_000) * 10) / 10}M ctx`;
  if (limit >= 1_000) return `${Math.round(limit / 1_000)}K ctx`;
  return `${limit} ctx`;
}

/** Admin selector pairing live provider model discovery with custom model ID entry. */
export function AdminAiModelSelector({
  selectedModel,
  models,
  catalogSource,
  isLoadingModels,
  onSelectModel,
  onRefreshModels,
}: AdminAiModelSelectorProps) {
  const [customMode, setCustomMode] = useState(false);

  const selectedOption = models.find((m) => m.id === selectedModel);

  return (
    <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/80 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-700 dark:text-zinc-300">
            Selected Model
          </span>
          <span
            className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
              catalogSource === "live"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700"
            }`}
          >
            {catalogSource === "live"
              ? `Live API · ${models.length} models`
              : `Fallback list · ${models.length} models`}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isLoadingModels}
            onClick={onRefreshModels}
            className="h-7 px-2 text-xs gap-1 cursor-pointer"
          >
            <RefreshCw
              className={`size-3 ${isLoadingModels ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setCustomMode((prev) => !prev)}
            className="h-7 px-2 text-xs gap-1 cursor-pointer"
          >
            <Pencil className="size-3" />
            <span>{customMode ? "Choose from list" : "Custom ID"}</span>
          </Button>
        </div>
      </div>

      {customMode ? (
        <input
          type="text"
          value={selectedModel}
          onChange={(e) => onSelectModel(e.target.value)}
          placeholder="e.g. gemini-2.5-flash"
          className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-mono text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-purple-500"
        />
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={isLoadingModels && models.length === 0}
            className="w-full sm:max-w-md flex items-center justify-between gap-2 h-9 px-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-left hover:border-slate-300 dark:hover:border-zinc-700 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-medium text-slate-900 dark:text-zinc-100 truncate">
                {selectedOption?.displayName || selectedModel}
              </span>
              <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 truncate">
                {selectedModel}
              </span>
            </div>
            <ChevronDown className="size-3.5 text-slate-400 shrink-0" />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="start"
            className="w-80 sm:w-96 max-h-72 overflow-y-auto p-1"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-[11px] text-muted-foreground px-2 py-1 font-normal">
                Available chat / structured-output models
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup className="space-y-0.5">
              {models.map((item) => {
                const isSelected = item.id === selectedModel;
                const ctxLabel = formatTokenLimit(item.inputTokenLimit);
                return (
                  <DropdownMenuItem
                    key={item.id}
                    onClick={() => onSelectModel(item.id)}
                    className="flex items-start justify-between gap-2 px-2.5 py-2 cursor-pointer rounded-md"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground truncate">
                          {item.displayName}
                        </span>
                        {ctxLabel && (
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {ctxLabel}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-muted-foreground truncate">
                        {item.id}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="size-3.5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
