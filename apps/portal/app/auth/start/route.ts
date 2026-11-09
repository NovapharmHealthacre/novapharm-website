import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createStagingTransaction, stagingCognitoSettings } from "../../../lib/cognito-staging-auth.mjs";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  try {
    const settings = stagingCognitoSettings();
    const rawAccess = request.nextUrl.searchParams.get("accessType") ?? "employee";
    if (rawAccess !== "employee" && rawAccess !== "board" && rawAccess !== "admin") throw new Error("Unsupported workforce scope.");
    const tx = createStagingTransaction(settings, Date.now(), rawAccess);
    const redirect = NextResponse.redirect(tx.url, 302);
    redirect.cookies.set("np_cognito_staging_tx", tx.cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/auth/",
      maxAge: 300,
    });
    redirect.headers.set("Cache-Control", "no-store");
    redirect.headers.set("Referrer-Policy", "no-referrer");
    return redirect;
  } catch {
    return NextResponse.json({ error: "Microsoft staging verification is not available." }, {
      status: 503,
      headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
    });
  }
}
