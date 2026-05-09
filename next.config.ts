import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    qualities: [75],
    remotePatterns: [
      {
        hostname: "**.public.blob.vercel-storage.com",
        protocol: "https",
      },
      {
        hostname: "avatar.vercel.sh",
        protocol: "https",
      },
    ],
  },
};

export default nextConfig;
