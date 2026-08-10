export type ServiceState = "operational" | "degraded" | "unavailable" | "configuration";
export type OverallState = "operational" | "degraded" | "activation" | "maintenance" | "disruption";

export interface ServiceStatus {
  readonly code: string;
  readonly name: string;
  readonly state: ServiceState;
  readonly message: string;
  readonly visibility: "public" | "private" | "current";
  readonly publicUrl?: string;
}

export interface StatusSnapshot {
  readonly checkedAt: string;
  readonly overall: OverallState;
  readonly headline: string;
  readonly notice?: string;
  readonly services: readonly ServiceStatus[];
}

interface TargetDefinition {
  readonly code: string;
  readonly name: string;
  readonly variable: string;
  readonly path: string;
  readonly publicLink: boolean;
  readonly expectedService?: string;
  readonly requireNoIndex?: boolean;
}

const targets: readonly TargetDefinition[] = Object.freeze([
  { code: "corporate", name: "NovaPharm Healthcare", variable: "CORPORATE_ORIGIN", path: "/", publicLink: true },
  { code: "technology", name: "NovaPharm Innovation & Technology", variable: "TECHNOLOGY_ORIGIN", path: "/", publicLink: true },
  { code: "founder", name: "Vishal Chakravarty", variable: "FOUNDER_ORIGIN", path: "/", publicLink: true },
  { code: "portal", name: "Secure portal", variable: "PORTAL_ORIGIN", path: "/", publicLink: false, requireNoIndex: true },
  { code: "api", name: "Platform API", variable: "PUBLIC_API_ORIGIN", path: "/api/health/live", publicLink: false, expectedService: "novapharm-api" },
]);

function configuredOrigin(value: string | undefined, production: boolean, loopbackValidation: boolean): string | null {
  if (!value) return null;
  const url = new URL(value);
  const loopback = ["127.0.0.1", "localhost", "::1"].includes(url.hostname);
  if (production && url.protocol !== "https:" && !(loopbackValidation && loopback && url.protocol === "http:")) {
    throw new Error("Production status targets must use HTTPS.");
  }
  if (!production && url.protocol !== "https:" && !(loopback && url.protocol === "http:")) {
    throw new Error("Validation status targets must use HTTPS or an HTTP loopback origin.");
  }
  if (url.pathname !== "/" || url.search || url.hash || url.username || url.password) {
    throw new Error("Status targets must be origins without paths, queries, fragments or credentials.");
  }
  return url.origin;
}

async function inspectTarget(target: TargetDefinition, environment: NodeJS.ProcessEnv, fetchImplementation: typeof fetch): Promise<ServiceStatus> {
  const visibility = target.publicLink ? "public" as const : "private" as const;
  let origin: string | null;
  try {
    origin = configuredOrigin(
      environment[target.variable],
      environment["NODE_ENV"] === "production",
      environment["STATUS_VALIDATION_MODE"] === "loopback-browser-acceptance",
    );
  } catch {
    return Object.freeze({ code: target.code, name: target.name, state: "configuration", message: "Origin configuration requires review.", visibility });
  }
  if (!origin) {
    return Object.freeze({ code: target.code, name: target.name, state: "configuration", message: "Managed service activation is pending.", visibility });
  }

  try {
    const response = await fetchImplementation(`${origin}${target.path}`, {
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(3_000),
      headers: { "User-Agent": "NovaPharm-Status/1.0" },
    });
    if (response.status !== 200) {
      return Object.freeze({ code: target.code, name: target.name, state: "unavailable", message: "The configured service did not return a healthy response.", visibility, ...(target.publicLink ? { publicUrl: origin } : {}) });
    }
    if (target.requireNoIndex && !/noindex/i.test(response.headers.get("x-robots-tag") ?? "")) {
      return Object.freeze({ code: target.code, name: target.name, state: "degraded", message: "The service responded, but its private indexing boundary needs attention.", visibility });
    }
    if (target.expectedService) {
      const payload = await response.json() as { status?: unknown; service?: unknown };
      if (payload.status !== "live" || payload.service !== target.expectedService) {
        return Object.freeze({ code: target.code, name: target.name, state: "degraded", message: "The service responded without the expected health contract.", visibility });
      }
    }
    return Object.freeze({ code: target.code, name: target.name, state: "operational", message: "The configured endpoint is responding normally.", visibility, ...(target.publicLink ? { publicUrl: origin } : {}) });
  } catch {
    return Object.freeze({ code: target.code, name: target.name, state: "unavailable", message: "The configured endpoint could not be reached.", visibility, ...(target.publicLink ? { publicUrl: origin } : {}) });
  }
}

export async function getStatusSnapshot(
  environment: NodeJS.ProcessEnv = process.env,
  fetchImplementation: typeof fetch = globalThis.fetch,
): Promise<StatusSnapshot> {
  const inspected = await Promise.all(targets.map((target) => inspectTarget(target, environment, fetchImplementation)));
  const services = Object.freeze([
    Object.freeze({ code: "status", name: "Status service", state: "operational" as const, message: "This status page is responding normally.", visibility: "current" as const }),
    ...inspected,
  ]);
  const states = new Set(services.map((service) => service.state));
  const maintenance = environment["STATUS_MODE"] === "maintenance";
  const maintenanceNotice = maintenance
    ? (environment["STATUS_MAINTENANCE_MESSAGE"]?.trim() || "Planned maintenance is in progress. Service availability remains visible below.").slice(0, 240)
    : undefined;
  const overall: OverallState = states.has("unavailable")
    ? "disruption"
    : maintenance
      ? "maintenance"
      : states.has("degraded")
        ? "degraded"
        : states.has("configuration")
          ? "activation"
          : "operational";
  const headline = {
    operational: "All configured services are responding normally.",
    degraded: "A configured service needs attention.",
    activation: "Managed service activation is still in progress.",
    maintenance: "Planned maintenance is in progress.",
    disruption: "A configured service is currently unavailable.",
  }[overall];
  return Object.freeze({
    checkedAt: new Date().toISOString(),
    overall,
    headline,
    ...(maintenanceNotice && overall === "maintenance" ? { notice: maintenanceNotice } : {}),
    services,
  });
}
