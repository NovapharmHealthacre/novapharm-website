import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const nextConfig: NextConfig = {
  output: "standalone",
  trailingSlash: true,
  // API Gateway HTTP APIs cannot define route keys ending in '/'. Keep
  // /healthz and Cognito start/callback reachable without a Next.js 308
  // into the IAM-protected /{proxy+} fallback.
  skipTrailingSlashRedirect: true,
  poweredByHeader: false,
  reactStrictMode: true,
  typedRoutes: true,
  turbopack: { root: workspaceRoot },
  experimental: {
    turbopackFileSystemCacheForDev: true,
    turbopackFileSystemCacheForBuild: true,
    useTypeScriptCli: true,
  },
};

export default nextConfig;
