import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { exchangeStagingCode, readStagingTransaction, stagingCognitoSettings, verifyStagingIdentity } from "../../../lib/cognito-staging-auth.mjs";
import { exchangeApprovedCognitoSession } from "../../../lib/cognito-session-exchange.mjs";
import { landingRouteForAccess } from "../../../data/routes";

export const dynamic = "force-dynamic";

const headers = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy": "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
};

function finish(message: string, status: number): NextResponse {
  const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>NovaPharm staging identity verification</title></head><body><main><h1>${message}</h1><p>The secure portal is not yet activated. This verification never issues an application session or grants customer, employee, board, or administrator permissions.</p><p>Close this tab when finished.</p></main></body></html>`;
  const response = new NextResponse(page, { status, headers: { ...headers, "Content-Type": "text/html; charset=utf-8" } });
  response.cookies.set("np_cognito_staging_tx", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/auth/",
    maxAge: 0,
  });
  return response;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const settings = stagingCognitoSettings();
    const callback = new URL(settings.callback);
    if (request.nextUrl.origin !== callback.origin || (request.nextUrl.pathname.endsWith("/") ? request.nextUrl.pathname : request.nextUrl.pathname + "/") !== callback.pathname) {
      return finish("Unrecognised verification destination", 400);
    }
    const params = request.nextUrl.searchParams;
    if (params.has("error")) return finish("Microsoft sign-in was not completed", 401);
    const tx = readStagingTransaction(request.cookies.get("np_cognito_staging_tx")?.value, params.get("state"), settings);
    if (!tx) return finish("Authentication request expired or was not recognised", 401);
    const token = await exchangeStagingCode(settings, params.get("code"), tx.verifier);
    await verifyStagingIdentity(settings, token, tx.nonce);
    if (process.env["COGNITO_PORTAL_SESSION_ENABLED"] !== "true") {
      return finish("Microsoft identity verified for staging", 200);
    }
    const approved = await exchangeApprovedCognitoSession({
      token,
      identityNonce: tx.nonce,
      accessType: tx.accessType,
    });
    if (approved.accessType !== tx.accessType) return finish("Unapproved portal role", 403);
    const redirect = NextResponse.redirect(new URL(landingRouteForAccess(tx.accessType), request.url), 302);
    redirect.cookies.set("np_session", approved.session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 28800,
    });
    redirect.cookies.set("np_cognito_staging_tx", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/auth/",
      maxAge: 0,
    });
    redirect.headers.set("Cache-Control", "no-store");
    redirect.headers.set("Referrer-Policy", "no-referrer");
    return redirect;
  } catch {
    return finish("Microsoft identity could not be verified", 401);
  }
}
