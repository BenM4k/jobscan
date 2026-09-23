import React from "react";
import { ChevronDown } from "lucide-react";

interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  ariaLabel: string;
  allLabel: string;
  isActive: boolean;
  prefix: string;
  minWidthClass?: string;
}

export function FilterSelect({
  value,
  onChange,
  options,
  ariaLabel,
  allLabel,
  isActive,
  prefix,
  minWidthClass = "min-w-[150px]",
}: FilterSelectProps) {
  return (
    <div className={`relative flex-1 sm:flex-initial ${minWidthClass}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className={`w-full h-11 appearance-none rounded-xl pl-4 pr-10 text-sm font-medium transition-all cursor-pointer border shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
          isActive
            ? "bg-blue-50/90 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/20 font-semibold"
            : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-700"
        }`}
      >
        <option value="all">{allLabel}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {isActive && value === opt.value
              ? `${prefix}: ${opt.label}`
              : opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className={`absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors ${
          isActive
            ? "text-blue-600 dark:text-blue-400"
            : "text-slate-400 dark:text-zinc-500"
        }`}
        aria-hidden="true"
      />
    </div>
  );
}
