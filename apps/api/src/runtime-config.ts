export type ApiRuntimeConfig = Readonly<{
  environment: "development" | "production";
  host: string;
  publicOrigin: string;
  apiOrigin: string;
  portalOrigin: string;
  allowedOrigins: readonly string[];
}>;

function origin(value: string | undefined, name: string): string {
  if (!value) throw new Error(`${name} is required.`);
  const parsed = new URL(value);
  if (parsed.pathname !== "/" || parsed.search || parsed.hash) throw new Error(`${name} must be an origin without a path, query or fragment.`);
  return parsed.origin;
}

export function createApiRuntimeConfig(environment: NodeJS.ProcessEnv): ApiRuntimeConfig {
  const production = environment["NODE_ENV"] === "production";
  const publicOrigin = origin(environment["PUBLIC_ORIGIN"] ?? (production ? undefined : "http://127.0.0.1:4300"), "PUBLIC_ORIGIN");
  const apiOrigin = origin(environment["PUBLIC_API_ORIGIN"] ?? (production ? undefined : "http://127.0.0.1:4173"), "PUBLIC_API_ORIGIN");
  const portalOrigin = origin(environment["PORTAL_ORIGIN"] ?? (production ? undefined : "http://127.0.0.1:4303"), "PORTAL_ORIGIN");
  const extraOrigins = String(environment["ALLOWED_ORIGINS"] ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => origin(value, "ALLOWED_ORIGINS entry"));
  const allowedOrigins = [...new Set([publicOrigin, portalOrigin, ...extraOrigins])];

  if (environment["PORTAL_PASSWORD"]) throw new Error("PORTAL_PASSWORD is prohibited; configure only a protected hash and salt.");
  if (allowedOrigins.some((value) => value.includes("*"))) throw new Error("Wildcard origins are prohibited.");
  if (production) {
    for (const [name, value] of [["PUBLIC_ORIGIN", publicOrigin], ["PUBLIC_API_ORIGIN", apiOrigin], ["PORTAL_ORIGIN", portalOrigin]] as const) {
      if (!value.startsWith("https://")) throw new Error(`${name} must use HTTPS in production.`);
    }
    if ((environment["HOST"] ?? "") !== "0.0.0.0") throw new Error("HOST must be 0.0.0.0 in production.");
    if (new Set([publicOrigin, apiOrigin, portalOrigin]).size !== 3) throw new Error("Public, API and portal production origins must be isolated.");
  }

  return Object.freeze({
    environment: production ? "production" : "development",
    host: environment["HOST"] ?? "127.0.0.1",
    publicOrigin,
    apiOrigin,
    portalOrigin,
    allowedOrigins: Object.freeze(allowedOrigins),
  });
}
