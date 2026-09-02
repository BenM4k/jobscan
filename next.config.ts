import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Increase EventEmitter max listeners to prevent Node.js Gzip decompression stream warnings during dev server reloads
if (typeof process !== "undefined" && process.setMaxListeners) {
  process.setMaxListeners(30);
}

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST?.startsWith("http")
  ? process.env.NEXT_PUBLIC_POSTHOG_HOST
  : "https://us.i.posthog.com";

const posthogAssetHost = posthogHost.includes("eu.i.posthog.com")
  ? "https://eu-assets.i.posthog.com"
  : "https://us-assets.i.posthog.com";

const nextConfig: NextConfig = {
  reactCompiler: true,
  cacheComponents: true,
  serverExternalPackages: ["unpdf", "mammoth"],
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: `${posthogAssetHost}/static/:path*`,
      },
      {
        source: "/ingest/:path*",
        destination: `${posthogHost}/:path*`,
      },
      {
        source: "/ingest/decide",
        destination: `${posthogHost}/decide`,
      },
    ];
  },
  // Required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

export default withNextIntl(nextConfig);

