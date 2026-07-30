import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  trailingSlash: true,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31_536_000,
  },
  turbopack: { root: workspaceRoot },
  experimental: {
    turbopackFileSystemCacheForDev: true,
    turbopackFileSystemCacheForBuild: true,
    useTypeScriptCli: true,
  },
  async redirects() {
    return [
      { source: "/about.html", destination: "/about/", permanent: true },
      { source: "/companies.html", destination: "/ventures/", permanent: true },
      { source: "/essays.html", destination: "/thinking/", permanent: true },
      { source: "/publications.html", destination: "/media/", permanent: true },
      { source: "/profiles.html", destination: "/facts/", permanent: true },
      {
        source: "/essays/why-i-left-swiggy/",
        destination: "/essays/why-i-chose-to-build-in-pharmaceuticals/",
        permanent: true,
      },
      {
        source: "/essays/from-swiggy-to-mhra/",
        destination: "/essays/why-i-chose-to-build-in-pharmaceuticals/",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
