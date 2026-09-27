"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AdminUserListItem } from "@/dal/admin.dal";
import { AdminUserRow } from "./AdminUserRow";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

interface AdminUsersTableProps {
  users: AdminUserListItem[];
  totalCount: number;
  page: number;
  totalPages: number;
  currentSearch?: string;
  currentRole?: string;
}

export function AdminUsersTable({
  users,
  totalCount,
  page,
  totalPages,
  currentSearch = "",
  currentRole = "",
}: AdminUsersTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(currentSearch);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (searchTerm.trim()) {
      params.set("search", searchTerm.trim());
    } else {
      params.delete("search");
    }
    params.set("page", "1");
    router.push(`/dashboard/admin/users?${params.toString()}`);
  };

  const handleRoleFilterChange = (role: string) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (role) {
      params.set("role", role);
    } else {
      params.delete("role");
    }
    params.set("page", "1");
    router.push(`/dashboard/admin/users?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("page", String(newPage));
    router.push(`/dashboard/admin/users?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      {/* Controls / Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
          />
        </form>

        <div className="flex items-center gap-2">
          <select
            value={currentRole}
            onChange={(e) => handleRoleFilterChange(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
          >
            <option value="">All Roles</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/80 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              <th className="py-3.5 pl-4 pr-3">User</th>
              <th className="px-3 py-3.5">Role</th>
              <th className="px-3 py-3.5">Credits</th>
              <th className="px-3 py-3.5">Subscription</th>
              <th className="px-3 py-3.5">Status</th>
              <th className="py-3.5 pl-3 pr-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-slate-500 dark:text-zinc-400">
                  No users found matching your criteria.
                </td>
              </tr>
            ) : (
              users.map((u) => <AdminUserRow key={u.id} user={u} />)
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2 pt-2 text-xs text-slate-500 dark:text-zinc-400">
        <div>
          Showing {users.length} of {totalCount} users
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => handlePageChange(page - 1)}
            className="h-8 px-2 text-xs"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          <span className="font-medium text-slate-900 dark:text-white">
            Page {page} of {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => handlePageChange(page + 1)}
            className="h-8 px-2 text-xs"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
