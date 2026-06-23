import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["169.254.123.242", "192.168.1.70"],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
