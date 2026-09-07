import React from "react";

export interface StatBoxProps {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  subValue?: React.ReactNode;
  className?: string;
}

export function StatBox({
  icon,
  label,
  value,
  subValue,
  className = "",
}: StatBoxProps) {
  return (
    <div
      className={`p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900/50 border border-slate-100 dark:border-zinc-800/60 ${className}`}
    >
      <div className="flex items-center gap-2 text-slate-500 dark:text-zinc-400 mb-1">
        {icon && <span className="text-slate-400 dark:text-zinc-500 shrink-0">{icon}</span>}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
        {value}
        {subValue && (
          <span className="text-xs font-normal text-slate-400 dark:text-zinc-500 ml-1">
            {subValue}
          </span>
        )}
      </div>
    </div>
  );
}
