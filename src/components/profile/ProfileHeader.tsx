"use client";

import React, { useState, useRef, useEffect } from "react";
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
    <header className="bg-white dark:bg-[#121215] border border-slate-300 dark:border-zinc-800 p-6 sm:p-8 rounded-3xl shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        {/* User Identity Info */}
        <div className="flex items-center gap-5 min-w-0">
          <div
            aria-hidden="true"
            className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-linear-to-br from-blue-600 via-indigo-600 to-emerald-500 text-white font-black text-2xl sm:text-3xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20 relative"
          >
            <span>{initials}</span>
            <span
              title="Profile Active"
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#121215] flex items-center justify-center text-[10px] text-white"
            >
              ✓
            </span>
          </div>

          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-slate-100 tracking-tight truncate">
                {name}
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
                PRO
              </span>
            </div>

            <p className="text-xs sm:text-sm font-bold text-blue-600 dark:text-indigo-400 truncate">
              {headline}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-gray-500 dark:text-zinc-400 font-medium">
              <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-zinc-800/80 text-gray-700 dark:text-zinc-300 px-2.5 py-0.5 rounded-lg border border-slate-200 dark:border-zinc-700/60">
                📍 {location}
              </span>

              <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800/60 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{t("openToWork")}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Actions Dropdown Button */}
        <div className="relative shrink-0 self-start sm:self-center" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            aria-expanded={dropdownOpen}
            className="inline-flex items-center gap-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-gray-800 dark:text-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl transition border border-slate-300 dark:border-zinc-700 shadow-xs cursor-pointer"
          >
            <span>⚙️ {t("manageProfile")}</span>
            <span className={`text-[10px] transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}>
              ▼
            </span>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#18181D] border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  onEditClick();
                }}
                className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800/80 flex items-center gap-2.5 cursor-pointer"
              >
                <span>✏️</span>
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
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800/80 flex items-center gap-2.5 cursor-pointer disabled:opacity-50"
                >
                  <span>✨</span>
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
                className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800/80 flex items-center gap-2.5 cursor-pointer"
              >
                <span>🔗</span>
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
                    <span>🗑️</span>
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
