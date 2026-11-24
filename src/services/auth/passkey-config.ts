export interface PasskeyAuthEnv {
  NODE_ENV?: string;
  BETTER_AUTH_URL?: string;
  NEXT_PUBLIC_APP_DOMAIN?: string;
  NEXT_PUBLIC_APP_URL?: string;
  VERCEL_PROJECT_PRODUCTION_URL?: string;
  VERCEL_URL?: string;
}

export interface ResolvedPasskeyAuthConfig {
  rpID: string;
  baseURL: string;
  passkeyOrigins: string[];
  trustedOrigins: string[];
}

const DEV_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:3002",
];

function isIpLiteral(hostname: string): boolean {
  const clean = hostname.replace(/^\[|\]$/g, "");
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(clean) || clean.includes(":");
}

/** Normalizes a URL or bare host string into a clean `origin` (scheme + host + optional port, no trailing slash). */
export function normalizeOrigin(raw?: string | null): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  const hasProtocol = /^https?:\/\//i.test(trimmed);
  const candidate = hasProtocol
    ? trimmed
    : /^(localhost|127\.0\.0\.1)(:|\/|$)/i.test(trimmed)
      ? `http://${trimmed}`
      : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

/**
 * Normalizes a URL or domain into a WebAuthn RP ID (bare lowercase hostname, apex when `www.` prefix is present).
 *
 * Rollout policy: consolidating onto the apex RP ID shares newly registered passkeys across both
 * apex and `www.` origins; any pre-existing credentials registered under a `www.` RP ID cannot be
 * validated by origin allowlists alone and require affected users to re-register a passkey.
 */
export function normalizeRpId(raw?: string | null): string | null {
  const origin = normalizeOrigin(raw);
  if (!origin) return null;

  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    if (!hostname) return null;
    if (hostname.startsWith("www.") && hostname.split(".").length >= 3) {
      return hostname.slice(4);
    }
    return hostname;
  } catch {
    return null;
  }
}

function addApexAndWwwVariants(originSet: Set<string>, origin: string): void {
  originSet.add(origin);
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== "https:") return;

    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      isIpLiteral(host) ||
      host.endsWith(".vercel.app")
    ) {
      return;
    }

    const portSuffix = parsed.port ? `:${parsed.port}` : "";
    const parts = host.split(".");
    if (host.startsWith("www.") && parts.length >= 3) {
      originSet.add(`https://${host.slice(4)}${portSuffix}`);
    } else if (parts.length === 2) {
      originSet.add(`https://www.${host}${portSuffix}`);
    }
  } catch {
    // Ignore malformed origin
  }
}

/**
 * Resolves consistent `rpID`, `baseURL`, `passkeyOrigins`, and `trustedOrigins`
 * across development and production (handling trailing slashes and apex/www pairs).
 */
export function resolvePasskeyAndAuthConfig(
  env: PasskeyAuthEnv
): ResolvedPasskeyAuthConfig {
  const baseURL =
    normalizeOrigin(env.BETTER_AUTH_URL) ||
    normalizeOrigin(env.VERCEL_PROJECT_PRODUCTION_URL) ||
    normalizeOrigin(env.NEXT_PUBLIC_APP_DOMAIN) ||
    normalizeOrigin(env.NEXT_PUBLIC_APP_URL) ||
    normalizeOrigin(env.VERCEL_URL) ||
    "http://localhost:3000";

  const rpID =
    normalizeRpId(env.NEXT_PUBLIC_APP_DOMAIN) ||
    normalizeRpId(baseURL) ||
    "localhost";

  const originSet = new Set<string>();
  const candidates = [
    env.BETTER_AUTH_URL,
    env.NEXT_PUBLIC_APP_URL,
    env.NEXT_PUBLIC_APP_DOMAIN,
    env.VERCEL_PROJECT_PRODUCTION_URL,
    env.VERCEL_URL,
    baseURL,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeOrigin(candidate);
    if (normalized) {
      addApexAndWwwVariants(originSet, normalized);
    }
  }

  if (env.NODE_ENV !== "production") {
    for (const devOrigin of DEV_ORIGINS) {
      originSet.add(devOrigin);
    }
  }

  const origins = Array.from(originSet);
  return {
    rpID,
    baseURL,
    passkeyOrigins: origins,
    trustedOrigins: origins,
  };
}
