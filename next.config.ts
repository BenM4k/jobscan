import type { NextConfig } from "next";

// Increase EventEmitter max listeners to prevent Node.js Gzip decompression stream warnings during dev server reloads
if (typeof process !== "undefined" && process.setMaxListeners) {
  process.setMaxListeners(30);
}

const nextConfig: NextConfig = {
  reactCompiler: true,
  cacheComponents: true,
};

export default nextConfig;

