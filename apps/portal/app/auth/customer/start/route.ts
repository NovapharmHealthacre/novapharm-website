import { NextResponse } from "next/server";
import { createCustomerLoginTransaction } from "../../../../../../src/core/intelligence-customer-oidc.mjs";

export const dynamic = "force-dynamic";

/** Invitation-only Cognito/PKCE identity. No customer application session is issued. */
export function GET(): Response {
  try {
    const transaction = createCustomerLoginTransaction({
      signingKey: process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"] ?? "",
    });
    const response = NextResponse.redirect(transaction.authorizeUrl, { status: 302 });
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
