import type { NextConfig } from "next";

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  {
    protocol: "https",
    hostname: "picsum.photos",
  },
];

const knownPatternKeys = new Set(
  remotePatterns.map((pattern) => `${pattern.protocol}:${pattern.hostname}`),
);

const addRemoteHost = (rawUrl?: string) => {
  const value = rawUrl?.trim();
  if (!value) {
    return;
  }

  const normalizedValue = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  let host = "";

  try {
    host = new URL(normalizedValue).hostname;
  } catch {
    return;
  }

  (["https", "http"] as const).forEach((protocol) => {
    const key = `${protocol}:${host}`;
    if (knownPatternKeys.has(key)) {
      return;
    }

    remotePatterns.push({
      protocol,
      hostname: host,
    });
    knownPatternKeys.add(key);
  });
};

// Ghost may return absolute image URLs from either host depending on deployment.
addRemoteHost(process.env.GHOST_IMAGE_HOST);
addRemoteHost(process.env.GHOST_CONTENT_API_URL);

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
