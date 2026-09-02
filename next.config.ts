import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Increase EventEmitter max listeners to prevent Node.js Gzip decompression stream warnings during dev server reloads
if (typeof process !== "undefined" && process.setMaxListeners) {
  process.setMaxListeners(30);
}

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

import { getPostHogConfig } from "./src/lib/posthog-config";

const { defaultApiHost, assetHost } = getPostHogConfig();
const rawPosthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
const posthogHost = rawPosthogHost?.startsWith("http")
  ? rawPosthogHost
  : defaultApiHost;
const posthogAssetHost = assetHost;

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
        source: "/ingest/array/:path*",
        destination: `${posthogAssetHost}/array/:path*`,
      },
      {
        source: "/array/:path*",
        destination: `${posthogAssetHost}/array/:path*`,
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
  async redirects() {
    return [
      {
        source: "/:path((?!ingest|array).+)/",
        destination: "/:path",
        permanent: true,
      },
    ];
  },
  // Required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

export default withNextIntl(nextConfig);

