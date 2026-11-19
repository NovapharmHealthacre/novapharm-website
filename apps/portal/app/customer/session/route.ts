import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Fail-closed fallback for a customer-session API not yet attached to the
 * independently authorised AWS API Gateway. A browser-facing Next.js app
 * must never redirect an API request to a public login page with HTTP 200.
 *
 * Once the separate signed Cognito-JWT and tenant/seat/source-rights API
 * is approved, API Gateway exact routes take precedence over the generic
 * portal catch-all. This fallback must never issue cookies or entitlements.
 */
function notLaunched(): Response {
  return NextResponse.json(
    { ok: false, code: "customer_access_not_launched" },
    {
      status: 503,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "Pragma": "no-cache",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

export const GET = notLaunched;
export const POST = notLaunched;
