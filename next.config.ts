import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Screenshots and voice notes are posted to API routes.
  experimental: {
    serverActions: { bodySizeLimit: "12mb" },
  },
};

export default nextConfig;
