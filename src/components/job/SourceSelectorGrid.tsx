"use client";

import React from "react";

export type FetchSource = "remoteok" | "drc" | "greenhouse" | "lever" | "ashby";

export interface FetchSourceOption {
  id: FetchSource;
  title: string;
  icon: string;
  type: "KEYWORD FILTER" | "COMPANY BOARD";
}

export const FETCH_SOURCES: FetchSourceOption[] = [
  { id: "remoteok", title: "RemoteOK", icon: "🌐", type: "KEYWORD FILTER" },
  { id: "drc", title: "DRC Local", icon: "🗺️", type: "KEYWORD FILTER" },
  { id: "greenhouse", title: "Greenhouse", icon: "🌿", type: "COMPANY BOARD" },
  { id: "lever", title: "Lever", icon: "⚡", type: "COMPANY BOARD" },
  { id: "ashby", title: "Ashby", icon: "🚀", type: "COMPANY BOARD" },
];

interface SourceSelectorGridProps {
  selectedSource: FetchSource;
  onSelectSource: (source: FetchSource) => void;
}

export function SourceSelectorGrid({
  selectedSource,
  onSelectSource,
}: SourceSelectorGridProps) {
  const renderCard = (s: FetchSourceOption) => {
    const isSelected = selectedSource === s.id;
    return (
      <button
        key={s.id}
        type="button"
        onClick={() => onSelectSource(s.id)}
        className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all relative cursor-pointer min-h-20.5 ${
          isSelected
            ? "border-blue-600 dark:border-blue-500 bg-blue-50/20 dark:bg-blue-950/20 shadow-xs ring-1 ring-blue-600 dark:ring-blue-500"
            : "border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-[#18181C] hover:border-slate-300 dark:hover:border-zinc-700"
        }`}
      >
        {isSelected && (
          <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 absolute top-3 right-3" />
        )}
        <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-gray-900 dark:text-slate-100">
          <span className="text-sm">{s.icon}</span>
          <span className="truncate">{s.title}</span>
        </div>
        <div>
          <span className="text-[9px] font-mono tracking-wider font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 uppercase inline-block">
            {s.type}
          </span>
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-3 gap-2.5">
        {FETCH_SOURCES.slice(0, 3).map(renderCard)}
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {FETCH_SOURCES.slice(3, 5).map(renderCard)}
      </div>
    </div>
  );
}
