import { randomBytes } from "node:crypto";
import { buildPublicSecurityPolicy } from "@novapharm/security";
import { type NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest): NextResponse {
  const nonce = randomBytes(16).toString("base64");
  const secureRequest = request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
  const policy = buildPublicSecurityPolicy({
    nonce,
    secureTransport: secureRequest,
    indexable: process.env.PUBLIC_INDEXABLE !== "false",
    connectSources: process.env.PUBLIC_API_ORIGIN ? [process.env.PUBLIC_API_ORIGIN] : [],
  });
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy.requestContentSecurityPolicy);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  for (const [name, value] of Object.entries(policy.responseHeaders)) response.headers.set(name, value);
  response.headers.set("Cache-Control", request.nextUrl.pathname.startsWith("/api/") ? "no-store" : "public, max-age=0, must-revalidate");
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|assets/).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
