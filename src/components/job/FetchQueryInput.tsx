"use client";

import React from "react";

const QUICK_FIELDS = [
  "Software",
  "Finance",
  "NGO",
  "Santé",
  "Logistique",
  "Mines",
  "RH",
];

interface FetchQueryInputProps {
  isKeywordSource: boolean;
  queryInput: string;
  onQueryChange: (query: string) => void;
}

export function FetchQueryInput({
  isKeywordSource,
  queryInput,
  onQueryChange,
}: FetchQueryInputProps) {
  return (
    <div className="p-4 bg-slate-50/80 dark:bg-zinc-900/50 rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 space-y-2">
      <label
        htmlFor="fetch-query-input"
        className="flex items-center gap-1.5 text-[10px] font-mono tracking-wider font-bold text-gray-500 dark:text-zinc-400 uppercase"
      >
        <span>🔍</span>
        <span>
          {isKeywordSource
            ? "TARGET KEYWORD / TAG"
            : "TARGET COMPANY BOARD TOKEN"}
        </span>
      </label>
      <input
        id="fetch-query-input"
        type="text"
        value={queryInput}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder={
          isKeywordSource
            ? "e.g. software developer, react, accountant..."
            : "e.g. vercel, stripe, figma, airbnb..."
        }
        className="w-full bg-transparent border-b border-slate-300 dark:border-zinc-700 text-gray-900 dark:text-slate-100 text-sm py-1.5 focus:outline-none focus:border-blue-500 transition placeholder:text-gray-400 dark:placeholder:text-zinc-500 font-medium"
      />
      {isKeywordSource && (
        <div className="pt-2 flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] font-medium text-gray-500 dark:text-zinc-400">
            Quick Fields:
          </span>
          {QUICK_FIELDS.map((field) => (
            <button
              key={field}
              type="button"
              onClick={() => onQueryChange(field)}
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border transition cursor-pointer ${
                queryInput.toLowerCase() === field.toLowerCase()
                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                  : "bg-white dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:border-blue-400 dark:hover:border-blue-500"
              }`}
            >
              {field}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
