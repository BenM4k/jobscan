"use client";

import React, { useState, useRef, useEffect } from "react";
import { Settings, ChevronDown, MapPin, Briefcase, FileText, Sparkles, Link2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("profile");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = (name || "Candidate")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <header className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        {/* User Identity Info */}
        <div className="flex items-start gap-4 sm:gap-5 min-w-0">
          {/* Avatar with Verified Status */}
          <div className="relative shrink-0">
            <div
              aria-hidden="true"
              className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-[#5B21B6] text-white font-black text-2xl sm:text-3xl flex items-center justify-center shadow-xs select-none tracking-tight"
            >
              <span>{initials}</span>
            </div>
            {/* Teal/Cyan verified status badge */}
            <span
              title="Profile Active"
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#06B6D4] border-2 border-white dark:border-[#0A0A0C] flex items-center justify-center text-[10px] text-white shadow-2xs"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
            </span>
          </div>

          <div className="space-y-1.5 min-w-0 flex-1">
            {/* Candidate Name */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-zinc-100 tracking-tight leading-tight">
              {name}
            </h1>

            {/* Headline */}
            <p className="text-xs sm:text-sm font-semibold text-[#6366F1] dark:text-indigo-400">
              {headline}
            </p>

            {/* Location and Open to Opportunities Pill Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1 bg-slate-100/90 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-300 px-2.5 py-1 rounded-md border border-slate-200 dark:border-zinc-700/70 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider font-mono">
                <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                <span>{location}</span>
              </span>

              <span className="inline-flex items-center gap-1.5 text-cyan-700 dark:text-cyan-300 bg-cyan-50/60 dark:bg-cyan-950/30 px-2.5 py-1 rounded-md border border-cyan-300/80 dark:border-cyan-800/60 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider font-mono">
                <Briefcase className="w-3 h-3 text-cyan-600 dark:text-cyan-400 shrink-0" />
                <span>{t("openToWork")}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Actions Dropdown Button */}
        <div className="relative shrink-0 self-start mt-1" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            aria-expanded={dropdownOpen}
            className="inline-flex items-center gap-2 bg-white dark:bg-[#121215] hover:bg-slate-50 dark:hover:bg-zinc-800/80 text-slate-700 dark:text-zinc-200 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-3.5 py-2 rounded-xl transition border border-slate-300 dark:border-zinc-700/80 shadow-2xs cursor-pointer font-mono"
          >
            <Settings className="w-3.5 h-3.5 text-slate-600 dark:text-zinc-400 shrink-0" />
            <span>{t("manageProfile")}</span>
            <ChevronDown
              className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
                dropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#18181D] border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  onEditClick();
                }}
                className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800/80 flex items-center gap-2.5 cursor-pointer"
              >
                <FileText className="w-4 h-4 text-slate-500" />
                <span>{t("editResume")}</span>
              </button>

              {onReformatClick && (
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    onReformatClick();
                  }}
                  disabled={isReformatting}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800/80 flex items-center gap-2.5 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <span>{isReformatting ? "..." : t("reExtract")}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  if (typeof window !== "undefined" && navigator.clipboard) {
                    navigator.clipboard.writeText(window.location.href);
                  }
                }}
                className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800/80 flex items-center gap-2.5 cursor-pointer"
              >
                <Link2 className="w-4 h-4 text-slate-500" />
                <span>{t("copyLink")}</span>
              </button>

              {onDeleteClick && (
                <>
                  <div className="my-1 border-t border-slate-100 dark:border-zinc-800" />
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      onDeleteClick();
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-rose-500" />
                    <span>{t("clearResume")}</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
