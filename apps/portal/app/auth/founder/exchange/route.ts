import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requestFounderPrivateSession } from "../../../../../../src/core/intelligence-founder-private-session-bridge.mjs";

export const dynamic = "force-dynamic";

const ORIGIN = "https://intelligence.novapharmhealthcare.com";
const securityHeaders = {
  "Cache-Control": "no-store",
  "Pragma": "no-cache",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

function denied(status: number): NextResponse {
  return NextResponse.json(
    { ok: false, code: "founder_session_unavailable" },
    { status, headers: securityHeaders },
  );
}

/**
 * Server-only bridge for the actual Cognito PASSWORD + TOTP login card.
 * API Gateway enforces the pinned Cognito JWT authorizer before invoking
 * this route. Cognito tokens must never enter storage, logs, links or HTML.
 * The separately verified founder Lambda remains the sole session issuer.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (request.headers.get("origin") !== ORIGIN) return denied(403);
  if (request.headers.get("content-type")?.split(";")[0]?.trim() !== "application/json")
    return denied(415);

  const authorization = request.headers.get("authorization") ?? "";
  if (!/^Bearer [A-Za-z0-9._-]{100,16000}$/u.test(authorization)) return denied(401);

  const declaredSize = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(declaredSize) || declaredSize > 20_000 || declaredSize < 0)
    return denied(413);

  try {
    const text = await request.text();
    if (text.length > 20_000) return denied(413);
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return denied(400);
    const accessToken = (parsed as Record<string, unknown>)["accessToken"];
    if (typeof accessToken !== "string" ||
        !/^[A-Za-z0-9._-]{100,16000}$/u.test(accessToken)) return denied(401);

    const session = await requestFounderPrivateSession({
      idToken: authorization.slice(7),
      accessToken,
      bridgeKey: process.env["NPI_FOUNDER_BRIDGE_KEY"] ?? "",
    });
    if (!session) return denied(503);

    const response = NextResponse.json({
      ok: true,
      code: "founder_session_active",
      role: "founder",
      scope: "founder-shell-read-only",
      customerAccess: false,
      medicinesDataAccess: false,
    }, { status: 200, headers: securityHeaders });
    response.cookies.set({
      name: "__Host-npi_founder",
      value: session.token,
      path: "/",
      secure: true,
      httpOnly: true,
      sameSite: "lax",
      maxAge: session.maxAge,
    });
    return response;
  } catch {
    return denied(400);
  }
}
