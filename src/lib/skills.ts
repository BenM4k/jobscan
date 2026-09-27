/**
 * Skill Name Normalization
 *
 * Normalizes skill strings: lowercase, trim, and whitespace-collapse.
 */
export function normalizeSkillName(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}
