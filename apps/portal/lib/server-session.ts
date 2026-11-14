import type { PortalView } from "../data/routes";
import { areaScopes } from "../data/routes";
import type { PortalUser } from "./gateway";

export type PortalSessionDecision = "allow" | "deny" | "change-password";

/** A cookie being present is not authentication. Check the signed server session. */
export function sessionDecision(view: PortalView, user: PortalUser | null): PortalSessionDecision {
  if (view.kind !== "module") return "allow";
  if (!user || !Array.isArray(user.accessScopes)) return "deny";
  if (user.mustChangePassword) return "change-password";
  // A customer scope alone is not a canonical account/tenant data authority.
  // Even an administrator must use a separately authorised customer link.
  if (view.module.area === "customer" && user.customerAccountLinked !== true) return "deny";
  const required = areaScopes[view.module.area];
  return user.accessScopes.includes(required) || user.accessScopes.includes("admin") ? "allow" : "deny";
}

type SessionLookupOptions = Readonly<{
  cookieValue: string;
  apiOrigin?: string;
  production?: boolean;
  validationMode?: boolean;
  fetchImpl?: typeof fetch;
}>;

function trustedApiOrigin(value: string | undefined, production: boolean, validationMode: boolean): string | null {
  if (!value) return null;
  try {
    const target = new URL(value);
    if (target.username || target.password || target.search || target.hash || target.pathname !== "/") return null;
    if (target.protocol === "https:") return target.origin;
    if ((!production || validationMode) && target.protocol === "http:" && ["127.0.0.1", "localhost"].includes(target.hostname)) return target.origin;
  } catch {
    // Malformed or untrusted API origins must never trigger outbound requests.
  }
  return null;
}

/**
 * Resolve an authenticated, revocable session before sending a protected
 * workspace's React Server Component payload. Never trust the cookie alone.
 * Failure, missing backend configuration, and upstream redirects all deny.
 */
export async function verifiedPortalSession({
  cookieValue,
  apiOrigin = process.env["INTERNAL_API_ORIGIN"] ?? process.env["PUBLIC_API_ORIGIN"],
  production = process.env["NODE_ENV"] === "production",
  validationMode = process.env["PORTAL_VALIDATION_MODE"] === "true",
  fetchImpl = globalThis.fetch,
}: SessionLookupOptions): Promise<PortalUser | null> {
  const origin = trustedApiOrigin(apiOrigin, production, validationMode);
  if (!origin || !/^[A-Za-z0-9_-]{16,128}\.[a-f0-9]{64}$/.test(cookieValue)) return null;
  try {
    const response = await fetchImpl(new URL("/api/portal/session", origin), {
      method: "GET",
      headers: { Cookie: "np_session=" + encodeURIComponent(cookieValue) },
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
    });
    if (response.status !== 200) return null;
    const payload: unknown = await response.json();
    if (typeof payload !== "object" || payload === null || !("user" in payload)) return null;
    const user = payload.user;
    if (typeof user !== "object" || user === null) return null;
    const fields = user as Record<string, unknown>;
    if (typeof fields["username"] !== "string" || !fields["username"]) return null;
    if (typeof fields["displayName"] !== "string" || typeof fields["role"] !== "string") return null;
    if (typeof fields["accessType"] !== "string" || typeof fields["mustChangePassword"] !== "boolean") return null;
    if (!Array.isArray(fields["accessScopes"]) || !fields["accessScopes"].every((scope: unknown) => typeof scope === "string")) return null;
    if (fields["customerAccountLinked"] !== undefined && typeof fields["customerAccountLinked"] !== "boolean") return null;
    // A signed session with a customer scope does not establish account ownership.
    if (fields["accessType"] === "customer" && fields["customerAccountLinked"] !== true) return null;
    return user as PortalUser;
  } catch {
    return null;
  }
}
