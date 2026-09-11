"use client";

import { useState, useTransition } from "react";
import {
  ShieldCheck,
  Search,
  UserPlus,
  Trash2,
  CheckCircle2,
  XCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  searchUsersAction,
  setUserFlagOverrideAction,
  removeUserFlagOverrideAction,
  setGlobalFlagAction,
} from "@/actions/admin.actions";
import type {
  UserFeatureFlagView,
  FeatureFlagAssignmentWithUser,
} from "@/services/flags";

interface AdminFeatureFlagsManagerProps {
  initialFlags: UserFeatureFlagView[];
  initialOverrides: FeatureFlagAssignmentWithUser[];
}

export function AdminFeatureFlagsManager({
  initialFlags,
  initialOverrides,
}: AdminFeatureFlagsManagerProps) {
  const [flags, setFlags] = useState(initialFlags);
  const [overrides, setOverrides] = useState(initialOverrides);
  const [isPending, startTransition] = useTransition();

  // User search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { id: string; email: string; name: string | null }[]
  >([]);
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    email: string;
  } | null>(null);
  const [selectedFlagKey, setSelectedFlagKey] = useState(
    initialFlags[0]?.key || "hybrid-scoring-v1"
  );
  const [overrideValue, setOverrideValue] = useState(true);

  // Global flag toggle
  const handleGlobalToggle = (flagKey: string, currentGlobal: boolean) => {
    const nextVal = !currentGlobal;
    setFlags((prev) =>
      prev.map((f) =>
        f.key === flagKey ? { ...f, enabledGlobally: nextVal } : f
      )
    );

    startTransition(async () => {
      const res = await setGlobalFlagAction(flagKey, nextVal);
      if (!res.success) {
        toast.error(res.error || "Failed to update global flag state");
        // Revert
        setFlags((prev) =>
          prev.map((f) =>
            f.key === flagKey ? { ...f, enabledGlobally: currentGlobal } : f
          )
        );
      } else {
        toast.success(`Global flag "${flagKey}" set to ${nextVal ? "ON" : "OFF"}`);
      }
    });
  };

  // Search users
  const handleSearchUsers = async (q: string) => {
    setSearchQuery(q);
    if (!q.trim() || q.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    startTransition(async () => {
      const res = await searchUsersAction(q);
      if (res.success && res.users) {
        setSearchResults(res.users);
      }
    });
  };

  // Add or update per-user override
  const handleAddOverride = () => {
    if (!selectedUser) {
      toast.error("Please search and select a user first");
      return;
    }

    startTransition(async () => {
      const res = await setUserFlagOverrideAction(
        selectedUser.id,
        selectedFlagKey,
        overrideValue
      );
      if (!res.success) {
        toast.error(res.error || "Failed to set user override");
      } else {
        toast.success(
          `Set override for ${selectedUser.email}: ${selectedFlagKey} = ${
            overrideValue ? "ENABLED" : "DISABLED"
          }`
        );
        // Update local list
        setOverrides((prev) => {
          const filtered = prev.filter(
            (o) =>
              !(o.userId === selectedUser.id && o.flagKey === selectedFlagKey)
          );
          return [
            {
              id: `temp-${Date.now()}`,
              featureFlagId: "",
              flagKey: selectedFlagKey,
              userId: selectedUser.id,
              userEmail: selectedUser.email,
              userName: null,
              enabled: overrideValue,
              updatedAt: new Date(),
            },
            ...filtered,
          ];
        });
        setSelectedUser(null);
        setSearchQuery("");
        setSearchResults([]);
      }
    });
  };

  // Remove per-user override
  const handleRemoveOverride = (userId: string, flagKey: string, email: string) => {
    startTransition(async () => {
      const res = await removeUserFlagOverrideAction(userId, flagKey);
      if (!res.success) {
        toast.error(res.error || "Failed to remove user override");
      } else {
        toast.success(`Removed override for ${email} on "${flagKey}"`);
        setOverrides((prev) =>
          prev.filter((o) => !(o.userId === userId && o.flagKey === flagKey))
        );
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* 1. Global Feature Flags Card */}
      <div className="bg-white dark:bg-[#121216] rounded-2xl border border-slate-200 dark:border-zinc-800/80 p-6 shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 pb-5">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>Global Feature Flags Rollout</span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
              Toggle global production availability. Individual user overrides take precedence over global toggles.
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-zinc-800/60 mt-2">
          {flags.map((flag) => {
            const isEnabled = flag.enabledGlobally;

            return (
              <div
                key={flag.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 first:pt-4 last:pb-2"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-gray-900 dark:text-zinc-200">
                      {flag.key}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                        isEnabled
                          ? "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800/60"
                          : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700/60"
                      }`}
                    >
                      Global: {isEnabled ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-zinc-400">
                    {flag.description || "System feature flag"}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleGlobalToggle(flag.key, isEnabled)}
                    disabled={isPending}
                    aria-label={`Toggle global state for ${flag.key}`}
                    aria-pressed={isEnabled}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      isEnabled
                        ? "bg-blue-600"
                        : "bg-slate-200 dark:bg-zinc-800"
                    } ${isPending ? "opacity-60" : ""}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        isEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. User Search & Per-User Override Assignment Card */}
      <div className="bg-white dark:bg-[#121216] rounded-2xl border border-slate-200 dark:border-zinc-800/80 p-6 shadow-2xs space-y-5">
        <div className="border-b border-slate-100 dark:border-zinc-800/80 pb-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Assign User Feature Override</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
            Search users by email and assign beta access or kill-switch overrides. Automatically invalidates Redis caches.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* User Search Input */}
          <div className="space-y-1 relative">
            <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
              User Search (by email)
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={selectedUser ? selectedUser.email : searchQuery}
                onChange={(e) => {
                  setSelectedUser(null);
                  handleSearchUsers(e.target.value);
                }}
                placeholder="e.g. user@example.com"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Search Dropdown Results */}
            {searchResults.length > 0 && !selectedUser && (
              <div className="absolute z-20 w-full mt-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800">
                {searchResults.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setSelectedUser({ id: u.id, email: u.email });
                      setSearchResults([]);
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-zinc-800 transition cursor-pointer flex flex-col"
                  >
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {u.email}
                    </span>
                    {u.name && (
                      <span className="text-[10px] text-gray-400">{u.name}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Flag Selection */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
              Feature Flag
            </label>
            <select
              value={selectedFlagKey}
              onChange={(e) => setSelectedFlagKey(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {flags.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.key}
                </option>
              ))}
            </select>
          </div>

          {/* Override State & Submit */}
          <div className="space-y-1 flex flex-col justify-end">
            <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
              Override Action
            </label>
            <div className="flex items-center gap-2">
              <select
                value={overrideValue ? "enable" : "disable"}
                onChange={(e) => setOverrideValue(e.target.value === "enable")}
                className="w-32 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="enable">Enable (On)</option>
                <option value="disable">Disable (Off)</option>
              </select>

              <Button
                type="button"
                onClick={handleAddOverride}
                disabled={!selectedUser || isPending}
                className="text-xs rounded-xl flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                Save Override
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Active User Overrides Table Card */}
      <div className="bg-white dark:bg-[#121216] rounded-2xl border border-slate-200 dark:border-zinc-800/80 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 pb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span>Active Per-User Overrides ({overrides.length})</span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
              Explicit user overrides queried via database SQL join with user emails.
            </p>
          </div>
        </div>

        {overrides.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-500 dark:text-zinc-400">
            No per-user overrides currently active. All users follow global default states.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-zinc-800 text-gray-500 dark:text-zinc-400">
                  <th className="py-2.5 font-semibold">User Email</th>
                  <th className="py-2.5 font-semibold">Feature Flag</th>
                  <th className="py-2.5 font-semibold">State</th>
                  <th className="py-2.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                {overrides.map((item) => (
                  <tr key={`${item.userId}-${item.flagKey}`} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/50">
                    <td className="py-3 font-medium text-gray-900 dark:text-zinc-200">
                      {item.userEmail}
                    </td>
                    <td className="py-3 font-mono text-gray-700 dark:text-zinc-300">
                      {item.flagKey}
                    </td>
                    <td className="py-3">
                      {item.enabled ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 dark:text-green-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Enabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
                          <XCircle className="w-3.5 h-3.5" />
                          Disabled
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleRemoveOverride(
                            item.userId,
                            item.flagKey,
                            item.userEmail
                          )
                        }
                        disabled={isPending}
                        className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
