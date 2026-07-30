import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const nextConfig: NextConfig = {
  output: "standalone",
  trailingSlash: true,
  poweredByHeader: false,
  reactStrictMode: true,
  typedRoutes: true,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31_536_000,
    deviceSizes: [375, 430, 768, 1024, 1440, 1920],
  },
  async redirects() {
    return [
      { source: "/company-profile/", destination: "/about/company/", permanent: true },
      { source: "/uk-international-regulatory-services/", destination: "/services/", permanent: true },
      { source: "/distributor-opportunities/", destination: "/partner-with-us/", permanent: true },
      { source: "/contact.html", destination: "/contact/", permanent: true },
      { source: "/solutions.html", destination: "/services/", permanent: true },
      { source: "/supply-chain.html", destination: "/partner-with-us/", permanent: true },
      { source: "/team.html", destination: "/leadership/", permanent: true },
    ];
  },
  turbopack: { root: workspaceRoot },
  experimental: {
    turbopackFileSystemCacheForDev: true,
    turbopackFileSystemCacheForBuild: true,
    useTypeScriptCli: true,
  },
};

export default nextConfig;
