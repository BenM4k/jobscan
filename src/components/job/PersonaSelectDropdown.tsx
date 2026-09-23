"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { MasterResumeSelect } from "@/services/db/schema";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Check, FileText, Plus, ExternalLink } from "lucide-react";

interface PersonaSelectDropdownProps {
  resumes: MasterResumeSelect[];
  selectedResumeId?: string;
  onSelectResume?: (id: string) => void;
  onAddPersona?: () => void;
  size?: "sm" | "xs";
  showIcon?: boolean;
  disabled?: boolean;
}

export function PersonaSelectDropdown({
  resumes,
  selectedResumeId,
  onSelectResume,
  onAddPersona,
  size = "sm",
  showIcon = true,
  disabled = false,
}: PersonaSelectDropdownProps) {
  const router = useRouter();
  const t = useTranslations("jobDetail");

  const heightClass = size === "xs" ? "h-6 px-2 text-xs" : "h-7 px-2.5 text-xs";
  const maxWidthClass = size === "xs" ? "max-w-[90px]" : "max-w-[110px]";

  if (resumes.length === 0) {
    if (!onAddPersona) return null;
    return (
      <button
        type="button"
        onClick={onAddPersona}
        disabled={disabled}
        className={`inline-flex items-center gap-1.5 rounded-lg border border-dashed border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100/50 dark:hover:bg-blue-900/30 font-medium transition-colors cursor-pointer ${heightClass}`}
      >
        <Plus className="size-3" />
        <span>{t("uploadResume")}</span>
      </button>
    );
  }

  const selectedPersona =
    resumes.find((r) => r.id === selectedResumeId) || resumes[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        className={`inline-flex items-center gap-1.5 rounded-lg border border-border bg-background hover:bg-muted font-normal text-foreground transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed ${heightClass}`}
        aria-label={t("selectScoringPersona")}
      >
        {showIcon && <FileText className="size-3.5 text-muted-foreground" />}
        <span className={`truncate ${maxWidthClass}`}>
          {selectedPersona?.label || t("personaLabel")}
        </span>
        <ChevronDown className="size-3 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-1">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1 font-normal">
            {t("scoringPersonaMenu")}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup className="space-y-0.5">
          {resumes.map((r) => (
            <DropdownMenuItem
              key={r.id}
              onClick={() => onSelectResume?.(r.id)}
              className="flex items-center justify-between text-xs px-2 py-1.5 cursor-pointer rounded-md"
            >
              <div className="flex items-center gap-1.5 truncate">
                <span className="truncate font-medium">{r.label}</span>
                {r.isActive && (
                  <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-1 py-0.2 rounded font-mono">
                    {t("activeTag")}
                  </span>
                )}
              </div>
              {r.id === selectedPersona?.id && (
                <Check className="size-3.5 text-blue-600 dark:text-blue-400 shrink-0 ml-1" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup className="space-y-0.5">
          {onAddPersona && (
            <DropdownMenuItem
              onClick={onAddPersona}
              className="flex items-center gap-2 text-xs px-2 py-1.5 cursor-pointer rounded-md text-blue-600 dark:text-blue-400 font-medium"
            >
              <Plus className="size-3.5 shrink-0" />
              <span>{t("addPersona")}</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => router.push("/dashboard/resumes")}
            className="flex items-center justify-between w-full text-xs px-2 py-1.5 cursor-pointer rounded-md text-muted-foreground hover:text-foreground"
          >
            <span className="truncate">{t("managePersonas")}</span>
            <ExternalLink className="size-3 shrink-0 ml-auto text-muted-foreground/70" />
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
