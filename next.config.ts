import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native libSQL bindings must not be bundled.
  serverExternalPackages: ["@libsql/client", "libsql"],
  images: { unoptimized: true },
};

export default nextConfig;
