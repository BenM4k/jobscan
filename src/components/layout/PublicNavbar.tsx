import { Navbar } from "@/components/layout/Navbar";

/**
 * Renders the shared Navbar shell in public mode so static chrome (Logo and PreferencesWidget)
 * stays prerendered while session and live credits stream inside tight Suspense boundaries.
 */
export function PublicNavbar() {
  return <Navbar mode="public" />;
}
