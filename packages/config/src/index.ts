import { capabilitiesFor, resolvePlatformMode, type PlatformMode } from "../../platform-mode/src/index.ts";

export interface EstateRuntimeConfig {
  readonly mode: PlatformMode;
  readonly publicOrigin: string;
  readonly portalOrigin?: string;
  readonly apiOrigin?: string;
  readonly statusOrigin?: string;
  readonly capabilities: ReturnType<typeof capabilitiesFor>;
}

function originFrom(name: string, value: string | undefined, production: boolean): string | undefined {
  if (!value) return undefined;
  if (value.includes("*")) throw new Error(`${name} cannot contain a wildcard.`);
  const url = new URL(value);
  const local = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (production && url.protocol !== "https:") throw new Error(`${name} must use HTTPS in production.`);
  if (!production && url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new Error(`${name} must use HTTPS or an HTTP loopback origin.`);
  }
  if (url.pathname !== "/" || url.search || url.hash || url.username || url.password) {
    throw new Error(`${name} must be an origin without a path, query, fragment or credentials.`);
  }
  return url.origin;
}

export function createEstateRuntimeConfig(environment: NodeJS.ProcessEnv): EstateRuntimeConfig {
  const production = environment["NODE_ENV"] === "production";
  const mode = resolvePlatformMode(environment["PLATFORM_MODE"]);
  const capabilities = capabilitiesFor(mode);
  const publicOrigin = originFrom("PUBLIC_ORIGIN", environment["PUBLIC_ORIGIN"] || environment["SITE_URL"], production);
  if (!publicOrigin) throw new Error("PUBLIC_ORIGIN is required.");
  const portalOrigin = originFrom("PORTAL_ORIGIN", environment["PORTAL_ORIGIN"], production);
  const apiOrigin = originFrom("PUBLIC_API_ORIGIN", environment["PUBLIC_API_ORIGIN"], production);
  const statusOrigin = originFrom("STATUS_ORIGIN", environment["STATUS_ORIGIN"], production);

  if (capabilities.portal && !portalOrigin) throw new Error("PORTAL_ORIGIN is required for FULL_PLATFORM.");
  if (capabilities.secureApi && !apiOrigin) throw new Error("PUBLIC_API_ORIGIN is required for FULL_PLATFORM.");
  const configured = [publicOrigin, portalOrigin, apiOrigin, statusOrigin].filter((value): value is string => Boolean(value));
  if (new Set(configured).size !== configured.length) throw new Error("Public, portal, API and status origins must be distinct.");

  return Object.freeze({
    mode,
    publicOrigin,
    ...(portalOrigin ? { portalOrigin } : {}),
    ...(apiOrigin ? { apiOrigin } : {}),
    ...(statusOrigin ? { statusOrigin } : {}),
    capabilities
  });
}
