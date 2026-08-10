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
    options.find((o) => o.id === value)?.label || value.toUpperCase();

  const activeStyles =
    accentColor === "indigo"
      ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20"
      : "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20";

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
        {title}:
      </span>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          aria-label={`Select ${title}, currently ${selectedLabel}`}
          className="bg-white dark:bg-[#18181B] border border-slate-300 dark:border-zinc-800 text-gray-900 dark:text-zinc-200 text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs hover:border-slate-400 dark:hover:border-zinc-700 transition flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
        >
          <span>{selectedLabel}</span>
          <span className="text-[10px] text-gray-400 dark:text-zinc-500" aria-hidden="true">▼</span>
        </PopoverTrigger>


        <PopoverContent
          align="start"
          className="w-72 p-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl shadow-xl"
        >
          <div className="text-[11px] font-bold text-gray-500 dark:text-slate-500 uppercase tracking-wider mb-2">
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
                  className={`p-2 rounded-xl text-[11px] font-bold transition-all text-center border flex items-center justify-center min-h-[42px] leading-tight cursor-pointer ${
                    active
                      ? activeStyles
                      : "bg-slate-50 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-gray-800 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-600"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
