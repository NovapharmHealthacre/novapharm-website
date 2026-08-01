import { randomBytes } from "node:crypto";
import { buildPublicSecurityPolicy } from "@novapharm/security";
import { type NextRequest, NextResponse } from "next/server";

const anonymousPaths = new Set(["/", "/portal/", "/auth/entra-complete/"]);

export function proxy(request: NextRequest): NextResponse {
  const nonce = randomBytes(16).toString("base64");
  const secureRequest = request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
  const policy = buildPublicSecurityPolicy({ nonce, secureTransport: secureRequest, indexable: false });
  const pathname = request.nextUrl.pathname.endsWith("/") ? request.nextUrl.pathname : `${request.nextUrl.pathname}/`;

  if (!pathname.startsWith("/gateway/") && !anonymousPaths.has(pathname) && !request.cookies.has("np_session")) {
    const login = new URL("/", request.url);
    login.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(login);
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
