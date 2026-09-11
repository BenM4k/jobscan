/**
 * Skill Name Normalization (Step 12)
 *
 * Normalizes skill strings: lowercase, trim, and whitespace-collapse only.
 * Deliberately does NOT perform synonym resolution (e.g. "JS" -> "JavaScript"),
 * which is deferred to the curated DAG in Step 27.
 */
export function normalizeSkillName(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}
