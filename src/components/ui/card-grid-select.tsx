"use client";

import React, { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface OptionItem<T extends string> {
  id: T;
  label: string;
}

interface CardGridSelectProps<T extends string> {
  title: string;
  value: T;
  options: OptionItem<T>[];
  onChange: (val: T) => void;
  accentColor?: "blue" | "indigo";
}

export function CardGridSelect<T extends string>({
  title,
  value,
  options,
  onChange,
  accentColor = "blue",
}: CardGridSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const selectedLabel =
    options.find((o) => o.id === value)?.label ||
    (value.charAt(0).toUpperCase() + value.slice(1));

  const activeStyles =
    accentColor === "indigo"
      ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20"
      : "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={`Select ${title}, currently ${selectedLabel}`}
        className="inline-flex items-center gap-1.5 text-xs hover:opacity-80 transition cursor-pointer font-sans select-none"
      >
        <span className="font-medium text-slate-500 dark:text-zinc-400 text-xs">
          {title}:
        </span>
        <span className="font-medium text-blue-600 dark:text-blue-400 text-xs">
          {selectedLabel}
        </span>
        <span className="text-[11px] text-blue-600 dark:text-blue-400" aria-hidden="true">
          ▾
        </span>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-72 p-3 bg-white dark:bg-[#121215] border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl space-y-2 font-sans"
      >
        <div className="text-xs font-medium text-gray-500 dark:text-slate-400">
          Select {title}
        </div>
        {/* 3 cards per row grid */}
        <div className="grid grid-cols-3 gap-1.5">
          {options.map((opt) => {
            const active = value === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => {
                  onChange(opt.id);
                  setOpen(false);
                }}
                className={`p-2 rounded-xl text-[11px] font-bold transition-all text-center border flex items-center justify-center min-h-[40px] leading-tight cursor-pointer ${
                  active
                    ? activeStyles
                    : "bg-slate-50 dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700 text-gray-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
