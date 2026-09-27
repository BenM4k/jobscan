/**
 * Determines whether a navigation link matches the current active pathname.
 * Handles exact root/dashboard match vs nested subpath matching.
 */
export function isNavActive(
  linkHref: string,
  currentPathname: string | null | undefined
): boolean {
  if (!currentPathname) return false;
  if (linkHref === "/dashboard") {
    return currentPathname === "/dashboard";
  }
  return currentPathname === linkHref || currentPathname.startsWith(linkHref + "/");
}
