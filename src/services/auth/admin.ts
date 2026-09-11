import "server-only";

/**
 * Step 18 Admin access: stopgap implementation.
 * Checks whether a user (or userId) is listed in the comma-separated ADMIN_USER_IDS env var.
 *
 * NOTE: This is an explicit temporary stopgap pending a full roles & permissions (RBAC) system.
 */
export function isAdmin(
  userOrId?: { id: string } | string | null
): boolean {
  if (!userOrId) return false;
  const userId = typeof userOrId === "string" ? userOrId : userOrId.id;
  if (!userId) return false;

  const adminIds = (process.env.ADMIN_USER_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  return adminIds.includes(userId);
}
