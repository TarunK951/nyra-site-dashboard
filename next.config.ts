import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow HMR / dev assets when opening the app via LAN IP (not localhost).
  allowedDevOrigins: ["172.16.1.98"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "plus.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
