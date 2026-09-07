"use client";

import React from "react";
import {
  Settings,
  MapPin,
  FileText,
  Sparkles,
  Link2,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface ProfileHeaderProps {
  name: string;
  headline: string;
  location: string;
  onEditClick: () => void;
  onReformatClick?: () => void;
  onDeleteClick?: () => void;
  isReformatting?: boolean;
}

export function ProfileHeader({
  name,
  headline,
  location,
  onEditClick,
  onReformatClick,
  onDeleteClick,
  isReformatting = false,
}: ProfileHeaderProps) {
  const t = useTranslations("profile");

  const initials = (name || "Candidate")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const handleCopyLink = () => {
    if (typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Profile link copied to clipboard");
    }
  };

  return (
    <header className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        {/* User Identity Info */}
        <div className="flex items-start gap-4 sm:gap-5 min-w-0">
          {/* Avatar with Status */}
          <div className="relative shrink-0">
            <div
              aria-hidden="true"
              className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-blue-600 text-white font-bold text-2xl sm:text-3xl flex items-center justify-center shadow-xs select-none tracking-tight font-sans"
            >
              <span>{initials}</span>
            </div>
            <span
              title="Profile Active"
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0A0A0C] flex items-center justify-center shadow-2xs"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
            </span>
          </div>

          <div className="space-y-1.5 min-w-0 flex-1">
            {/* Candidate Name */}
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight leading-tight font-sans">
              {name}
            </h1>

            {/* Headline */}
            <p className="text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400">
              {headline}
            </p>

            {/* Standardized Pills: Location & Open to Opportunities */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 px-2.5 py-1 rounded-md border border-slate-200 dark:border-zinc-700/70 text-xs font-medium font-sans">
                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>{location}</span>
              </span>

              <span className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 px-2.5 py-1 rounded-md border border-slate-200 dark:border-zinc-700/70 text-xs font-medium font-sans">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span>{t("openToWork")}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Manage Profile Dropdown - Standard Shadcn Outline Button */}
        <div className="shrink-0 self-start mt-1">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-xs font-medium rounded-lg cursor-pointer h-8 px-3"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400 shrink-0" />
                  <span>{t("manageProfile")}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                </Button>
              }
            />

            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={onEditClick} className="cursor-pointer text-xs">
                <FileText className="w-4 h-4 mr-2 text-slate-500 shrink-0" />
                <span>{t("editResume")}</span>
              </DropdownMenuItem>

              {onReformatClick && (
                <DropdownMenuItem
                  onClick={onReformatClick}
                  disabled={isReformatting}
                  className="cursor-pointer text-xs"
                >
                  <Sparkles className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>{isReformatting ? "..." : t("reExtract")}</span>
                </DropdownMenuItem>
              )}

              <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer text-xs">
                <Link2 className="w-4 h-4 mr-2 text-slate-500 shrink-0" />
                <span>{t("copyLink")}</span>
              </DropdownMenuItem>

              {onDeleteClick && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onDeleteClick}
                    className="cursor-pointer text-xs text-rose-600 dark:text-rose-400 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/40 font-semibold"
                  >
                    <Trash2 className="w-4 h-4 mr-2 text-rose-500 shrink-0" />
                    <span>{t("clearResume")}</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
