"use client";

import { useRef, useState, useTransition } from "react";
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
import { GlobalFlagsCard } from "@/components/admin/GlobalFlagsCard";
import {
  UserFlagOverrideForm,
  type SearchedFlagUser,
} from "@/components/admin/UserFlagOverrideForm";
import { ActiveOverridesTable } from "@/components/admin/ActiveOverridesTable";

interface AdminFeatureFlagsManagerProps {
  initialFlags: UserFeatureFlagView[];
  initialOverrides: FeatureFlagAssignmentWithUser[];
}

/** Coordinates admin global feature flags and per-user override management. */
export function AdminFeatureFlagsManager({
  initialFlags,
  initialOverrides,
}: AdminFeatureFlagsManagerProps) {
  const [flags, setFlags] = useState(initialFlags);
  const [overrides, setOverrides] = useState(initialOverrides);
  const [isPending, startTransition] = useTransition();

  const searchRequestIdRef = useRef(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchedFlagUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    email: string;
  } | null>(null);
  const [selectedFlagKey, setSelectedFlagKey] = useState(
    initialFlags[0]?.key || "hybrid-scoring-v1",
  );
  const [overrideValue, setOverrideValue] = useState(true);

  const handleGlobalToggle = (flagKey: string, currentGlobal: boolean) => {
    const nextVal = !currentGlobal;
    setFlags((prev) =>
      prev.map((f) =>
        f.key === flagKey ? { ...f, enabledGlobally: nextVal } : f,
      ),
    );

    startTransition(async () => {
      const res = await setGlobalFlagAction(flagKey, nextVal);
      if (!res.success) {
        toast.error(res.error || "Failed to update global flag state");
        setFlags((prev) =>
          prev.map((f) =>
            f.key === flagKey ? { ...f, enabledGlobally: currentGlobal } : f,
          ),
        );
      } else {
        toast.success(`Global flag "${flagKey}" set to ${nextVal ? "ON" : "OFF"}`);
      }
    });
  };

  const handleSearchQueryChange = (value: string) => {
    searchRequestIdRef.current += 1;
    setSearchQuery(value);
  };

  const handleSearchUsers = async (): Promise<boolean> => {
    const query = (selectedUser ? selectedUser.email : searchQuery).trim();
    if (!query) {
      toast.error("Please enter an email to search");
      return false;
    }

    const reqId = ++searchRequestIdRef.current;
    setIsSearching(true);
    try {
      const res = await searchUsersAction(query);
      if (reqId !== searchRequestIdRef.current) {
        return false;
      }
      if (res.success && res.users) {
        setSearchResults(res.users);
        if (res.users.length === 0) {
          toast.info("No users found matching that email");
          return false;
        }
        return true;
      } else {
        toast.error(res.error || "Failed to search users");
        return false;
      }
    } catch {
      if (reqId === searchRequestIdRef.current) {
        toast.error("An unexpected error occurred while searching");
      }
      return false;
    } finally {
      if (reqId === searchRequestIdRef.current) {
        setIsSearching(false);
      }
    }
  };

  const handleSelectUser = (user: SearchedFlagUser | null) => {
    searchRequestIdRef.current += 1;
    if (!user) {
      setSelectedUser(null);
      return;
    }
    setSelectedUser({ id: user.id, email: user.email });
    setSearchQuery(user.email);
    setSearchResults([]);
  };

  const handleAddOverride = () => {
    if (!selectedUser) {
      toast.error("Please search and select a user first");
      return;
    }

    startTransition(async () => {
      const res = await setUserFlagOverrideAction(
        selectedUser.id,
        selectedFlagKey,
        overrideValue,
      );
      if (!res.success) {
        toast.error(res.error || "Failed to set user override");
      } else {
        toast.success(
          `Set override for ${selectedUser.email}: ${selectedFlagKey} = ${
            overrideValue ? "ENABLED" : "DISABLED"
          }`,
        );
        setOverrides((prev) => {
          const filtered = prev.filter(
            (o) => !(o.userId === selectedUser.id && o.flagKey === selectedFlagKey),
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

  const handleRemoveOverride = (userId: string, flagKey: string, email: string) => {
    startTransition(async () => {
      const res = await removeUserFlagOverrideAction(userId, flagKey);
      if (!res.success) {
        toast.error(res.error || "Failed to remove user override");
      } else {
        toast.success(`Removed override for ${email} on "${flagKey}"`);
        setOverrides((prev) =>
          prev.filter((o) => !(o.userId === userId && o.flagKey === flagKey)),
        );
      }
    });
  };

  return (
    <div className="space-y-8">
      <GlobalFlagsCard
        flags={flags}
        isPending={isPending}
        onToggle={handleGlobalToggle}
      />

      <UserFlagOverrideForm
        flags={flags}
        searchQuery={searchQuery}
        onSearchQueryChange={handleSearchQueryChange}
        isSearching={isSearching}
        searchResults={searchResults}
        selectedUser={selectedUser}
        onSelectUser={handleSelectUser}
        selectedFlagKey={selectedFlagKey}
        onSelectFlagKey={setSelectedFlagKey}
        overrideValue={overrideValue}
        onOverrideValueChange={setOverrideValue}
        isPending={isPending}
        onSearchUsers={handleSearchUsers}
        onAddOverride={handleAddOverride}
      />

      <ActiveOverridesTable
        overrides={overrides}
        isPending={isPending}
        onRemove={handleRemoveOverride}
      />
    </div>
  );
}
