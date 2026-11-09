import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { stagingCognitoSettings } from "../../../lib/cognito-staging-auth.mjs";

export const dynamic = "force-dynamic";

// Application session is revoked by the protected API before this route is opened.
// Cognito logout is optional until an exact HTTPS AllowedSignOutURL is approved.
export function GET(request: NextRequest): NextResponse {
  const back = new URL("/", request.url);
  let target = back;
  try {
    const config = stagingCognitoSettings();
    const allowed = process.env["COGNITO_POST_LOGOUT_URL"];
    const portal = new URL(process.env["PORTAL_ORIGIN"] || "https://invalid.invalid");
    if (allowed === portal.origin + "/" && allowed === back.toString() && portal.protocol === "https:") {
      const logout = new URL("/logout", config.domain);
      logout.searchParams.set("client_id", config.clientId);
      logout.searchParams.set("logout_uri", allowed);
      target = logout;
    }
  } catch {
    target = back;
  }
  const response = NextResponse.redirect(target, 302);
  response.cookies.set("np_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
