import { NextResponse } from "next/server";
import { createCustomerLoginTransaction } from "../../../../../../src/core/intelligence-customer-oidc.mjs";

export const dynamic = "force-dynamic";

/**
 * Customer-initiated verified business identity registration. The Cognito
 * managed sign-up page owns the password, email verification and TOTP setup.
 * The same signed state, nonce, PKCE and short-lived host-only transaction
 * cookie as /auth/customer/start bind its eventual OIDC callback.
 *
 * Identity self-registration DOES NOT create a tenant, accept commercial
 * contracts, activate Stripe Checkout or grant medicines-data access.
 */
export function GET(): Response {
  try {
    const txn = createCustomerLoginTransaction({
      signingKey: process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"] ?? "",
    });
    const destination = new URL(txn.authorizeUrl);
    if (destination.protocol !== "https:" ||
        destination.hostname !== "novapharm-intelligence-production-eun1.auth.eu-north-1.amazoncognito.com" ||
        destination.pathname !== "/oauth2/authorize" ||
        destination.searchParams.get("code_challenge_method") !== "S256" ||
        !destination.searchParams.get("state") ||
        !destination.searchParams.get("nonce")) {
      throw new Error("Unapproved registration destination");
    }
    destination.pathname = "/signup";
    const response = NextResponse.redirect(destination, { status: 302 });
    response.cookies.set({
      name: "__Host-npi_oidc_tx",
      value: txn.transactionCookieValue,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: txn.cookieMaxAgeSeconds,
    });
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    return response;
  } catch {
    return Response.json(
      { ok: false, code: "customer_registration_unavailable" },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": "30",
          "X-Robots-Tag": "noindex, nofollow, noarchive",
        },
      },
    );
  }
}
