import { Suspense } from "react";
import { getAdminUsers } from "@/services/admin/admin.service";
import { AdminUsersTable } from "@/components/admin/AdminUsersTable";

interface UsersPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    role?: string;
  }>;
}

function UsersSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 bg-slate-100 dark:bg-zinc-800/50 rounded-xl" />
      <div className="h-96 bg-slate-100 dark:bg-zinc-800/50 rounded-2xl border border-slate-200 dark:border-zinc-800" />
    </div>
  );
}

async function UsersContent({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; role?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10) || 1;
  const search = params.search || "";
  const role = params.role || "";

  const usersRes = await getAdminUsers({
    page,
    limit: 20,
    search: search || undefined,
    role: role || undefined,
  });

  const data = usersRes.ok
    ? usersRes.value
    : { users: [], totalCount: 0, page: 1, totalPages: 1 };

  return (
    <AdminUsersTable
      users={data.users}
      totalCount={data.totalCount}
      page={data.page}
      totalPages={data.totalPages}
      currentSearch={search}
      currentRole={role}
    />
  );
}

export default async function AdminUsersPage({
  searchParams,
}: UsersPageProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          User Management
        </h2>
        <p className="text-sm text-slate-500 dark:text-zinc-400">
          Manage user accounts, assign administrator roles, grant credits, or update access bans.
        </p>
      </div>

      <Suspense fallback={<UsersSkeleton />}>
        <UsersContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
