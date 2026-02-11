import type { NextConfig } from "next";

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  {
    protocol: "https",
    hostname: "picsum.photos",
  },
];

if (process.env.CONTENT_PROVIDER === "ghost" && process.env.GHOST_IMAGE_HOST) {
  const ghostHost = process.env.GHOST_IMAGE_HOST.replace(/^https?:\/\//, "");
  remotePatterns.push({
    protocol: "https",
    hostname: ghostHost,
  });
  remotePatterns.push({
    protocol: "http",
    hostname: ghostHost,
  });
}

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  onDemandEntries: {
    maxInactiveAge: 25000,
    pagesBufferLength: 3,
  },
  images: {
    remotePatterns,
  },
};

export default nextConfig;
