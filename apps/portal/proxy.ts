import { randomBytes } from "node:crypto";
import { buildPublicSecurityPolicy } from "@novapharm/security";
import { type NextRequest, NextResponse } from "next/server";

const anonymousPaths = new Set(["/", "/portal/", "/auth/entra-complete/", "/healthz/", "/auth/customer/start/", "/auth/customer/register/", "/auth/callback/", "/auth/mfa/setup/", "/auth/internal/mfa/setup/", "/auth/founder/exchange/", "/customer/session/", "/customer/logout/"]);
/**
 * /auth/internal/mfa/setup/ is anonymous ONLY to the legacy np_session proxy.
 * Its downstream handler requires a valid ten-minute, AES-GCM authenticated,
 * user-bound Cognito enrolment cookie and same-origin CSRF on POST; this
 * exception does NOT grant an application session or workspace permissions.
 *
 * /auth/founder/exchange/ is anonymous ONLY to the legacy np_session proxy
 * guard: the API Gateway JWT authorizer, same-origin POST checks and remote
 * founder-only backend still enforce real MFA and session issuance.
 *
 * Only these paths may reach their own downstream founder session verifier.
 * They are NOT authenticated by proxy or by a cookie's mere presence.
 * /founder/ SSR always calls the independent, revocable founder-session API.
 * Do not grant this namespace access to legacy portal/board/customer routes.
 */
const founderVerifiedPaths = new Set(["/founder/", "/founder/logout/"]);

export function proxy(request: NextRequest): NextResponse {
  const nonce = randomBytes(16).toString("base64");
  const secureRequest = request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
  // Cognito's pinned user-pool API is the only external connection allowed
  // for the owner-approved direct password + TOTP card on the Intelligence host.
  const intelligenceHost = request.headers.get("host")?.split(":")[0]?.toLowerCase() === "intelligence.novapharmhealthcare.com";
  const policy = buildPublicSecurityPolicy({
    nonce, secureTransport: secureRequest, indexable: false,
    connectSources: intelligenceHost ? ["https://cognito-idp.eu-north-1.amazonaws.com"] : [],
  });
  const pathname = request.nextUrl.pathname.endsWith("/") ? request.nextUrl.pathname : `${request.nextUrl.pathname}/`;

  if (!pathname.startsWith("/gateway/") && !anonymousPaths.has(pathname) && !founderVerifiedPaths.has(pathname) && !request.cookies.has("np_session")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy.requestContentSecurityPolicy);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  for (const [name, value] of Object.entries(policy.responseHeaders)) response.headers.set(name, value);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = {
  matcher: [{ source: "/((?!_next/static|_next/image|assets/).*)" }],
};
