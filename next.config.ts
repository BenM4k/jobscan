import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Increase EventEmitter max listeners to prevent Node.js Gzip decompression stream warnings during dev server reloads
if (typeof process !== "undefined" && process.setMaxListeners) {
  process.setMaxListeners(30);
}

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactCompiler: true,
  cacheComponents: true,
};

export default withNextIntl(nextConfig);
