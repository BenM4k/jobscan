/**
 * Validates that an external URL uses an explicit http(s) protocol.
 * Rejects javascript:, data:, vbscript:, relative paths, and malformed URLs.
 */
export function sanitizeExternalUrl(
  rawUrl: string | null | undefined,
  options?: { httpsOnly?: boolean }
): string | null {
  const trimmed = rawUrl?.trim();
  if (!trimmed) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (options?.httpsOnly) {
    return parsed.protocol === "https:" ? parsed.toString() : null;
  }

  return parsed.protocol === "https:" || parsed.protocol === "http:"
    ? parsed.toString()
    : null;
}
