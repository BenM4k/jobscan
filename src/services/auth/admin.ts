/**
 * Admin access verification.
 * Checks whether a user has the "admin" role.
 */
export function isAdmin(
  user?: { id: string; role?: string | null } | null
): boolean {
  if (!user || typeof user !== "object") return false;
  return user.role === "admin";
}
