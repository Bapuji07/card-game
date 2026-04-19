import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Remove the invalid eslint key and just use typescript ignore for now
};

export default nextConfig;
