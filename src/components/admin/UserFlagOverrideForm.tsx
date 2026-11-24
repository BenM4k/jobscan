"use client";

import { useState } from "react";
import { Search, UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { UserFeatureFlagView } from "@/services/flags";

export interface SearchedFlagUser {
  id: string;
  email: string;
  name: string | null;
}

interface UserFlagOverrideFormProps {
  flags: UserFeatureFlagView[];
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  isSearching: boolean;
  searchResults: SearchedFlagUser[];
  selectedUser: { id: string; email: string } | null;
  onSelectUser: (user: SearchedFlagUser | null) => void;
  selectedFlagKey: string;
  onSelectFlagKey: (key: string) => void;
  overrideValue: boolean;
  onOverrideValueChange: (val: boolean) => void;
  isPending: boolean;
  onSearchUsers: () => Promise<void>;
  onAddOverride: () => void;
}

/** Form for searching users and assigning per-user feature flag overrides. */
export function UserFlagOverrideForm({
  flags,
  searchQuery,
  onSearchQueryChange,
  isSearching,
  searchResults,
  selectedUser,
  onSelectUser,
  selectedFlagKey,
  onSelectFlagKey,
  overrideValue,
  onOverrideValueChange,
  isPending,
  onSearchUsers,
  onAddOverride,
}: UserFlagOverrideFormProps) {
  const [resultsOpen, setResultsOpen] = useState(false);

  const runSearch = async () => {
    await onSearchUsers();
    setResultsOpen(true);
  };

  const showPopover = resultsOpen && searchResults.length > 0 && !selectedUser;

  return (
    <div className="bg-white dark:bg-[#121216] rounded-2xl border border-slate-200 dark:border-zinc-800/80 p-6 shadow-2xs space-y-5">
      <div className="border-b border-slate-100 dark:border-zinc-800/80 pb-4">
        <h2 className="text-base font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <span>Assign User Feature Override</span>
        </h2>
        <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
          Search users by email and assign beta access or kill-switch overrides.
          Automatically invalidates Redis caches.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label
            htmlFor="flag-user-search"
            className="text-xs font-semibold text-gray-700 dark:text-zinc-300"
          >
            User Search (by email)
          </label>
          <Popover open={showPopover} onOpenChange={setResultsOpen}>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                <input
                  id="flag-user-search"
                  type="text"
                  value={selectedUser ? selectedUser.email : searchQuery}
                  onChange={(e) => {
                    onSelectUser(null);
                    onSearchQueryChange(e.target.value);
                    setResultsOpen(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void runSearch();
                    }
                  }}
                  placeholder="e.g. user@example.com"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <PopoverTrigger
                render={
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isSearching || (!searchQuery.trim() && !selectedUser)}
                    onClick={() => void runSearch()}
                    className="h-8.5 px-3 text-xs shrink-0 cursor-pointer"
                  >
                    {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Search"}
                  </Button>
                }
              />
            </div>

            <PopoverContent
              align="end"
              className="w-72 p-1 max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800"
            >
              {searchResults.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    onSelectUser(u);
                    setResultsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs rounded-md hover:bg-slate-50 dark:hover:bg-zinc-800 transition cursor-pointer flex flex-col"
                >
                  <span className="font-semibold text-gray-900 dark:text-white">{u.email}</span>
                  {u.name && <span className="text-[10px] text-gray-400">{u.name}</span>}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="flag-key-select"
            className="text-xs font-semibold text-gray-700 dark:text-zinc-300"
          >
            Feature Flag
          </label>
          <select
            id="flag-key-select"
            value={selectedFlagKey}
            onChange={(e) => onSelectFlagKey(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {flags.map((f) => (
              <option key={f.key} value={f.key}>
                {f.key}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1 flex flex-col justify-end">
          <label
            htmlFor="flag-override-action"
            className="text-xs font-semibold text-gray-700 dark:text-zinc-300"
          >
            Override Action
          </label>
          <div className="flex items-center gap-2">
            <select
              id="flag-override-action"
              value={overrideValue ? "enable" : "disable"}
              onChange={(e) => onOverrideValueChange(e.target.value === "enable")}
              className="w-32 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="enable">Enable (On)</option>
              <option value="disable">Disable (Off)</option>
            </select>

            <Button
              type="button"
              onClick={onAddOverride}
              disabled={!selectedUser || isPending}
              className="text-xs rounded-xl flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              Save Override
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
