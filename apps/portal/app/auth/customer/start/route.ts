import { type NextRequest, NextResponse } from "next/server";
import { createCustomerLoginTransaction } from "../../../../../../src/core/intelligence-customer-oidc.mjs";

export const dynamic = "force-dynamic";

/** Cognito-managed identity and recovery. Neither path issues a customer session. */
export function GET(request?: NextRequest): Response {
  try {
    // Plan is validated by the core allowlist and bound into a signed
    // PKCE transaction. Query text must never become a Stripe price ID.
    const requestedPlan = request?.nextUrl.searchParams.get("plan") ?? undefined;
    const requestedCycle = request?.nextUrl.searchParams.get("cycle") ?? undefined;
    const transaction = createCustomerLoginTransaction({
      signingKey: process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"] ?? "",
      requestedPlan,
      requestedCycle,
    });
    // Cognito's two-step choice-based password screen can omit its forgot-link.
    // Official /forgotPassword accepts the same OAuth+PKCE parameters as /authorize.
    // Reuse a fresh, signed 15-minute transaction; do not handle reset codes,
    // passwords or Cognito tokens in our application.
    const target = new URL(transaction.authorizeUrl);
    if (request?.nextUrl.searchParams.get("mode") === "reset") {
      target.pathname = "/forgotPassword";
    }
    const response = NextResponse.redirect(target, { status: 302 });
    response.cookies.set({
      name: "__Host-npi_oidc_tx",
      value: transaction.transactionCookieValue,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: transaction.cookieMaxAgeSeconds,
    });
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    return response;
  } catch {
    return Response.json(
      { error: "Secure customer sign-in is not yet available." },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "30", "X-Robots-Tag": "noindex, nofollow, noarchive" } },
    );
  }
}
