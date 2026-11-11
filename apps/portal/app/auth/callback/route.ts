import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  exchangeCustomerAuthCode,
  verifyCustomerLoginTransaction,
  verifyIntelligenceCustomerIdToken,
} from "../../../../../src/core/intelligence-customer-oidc.mjs";

export const dynamic = "force-dynamic";

const securityHeaders = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
} as const;

function resultPage(verified: boolean): NextResponse {
  const title = verified ? "Identity verified" : "Sign-in could not be completed";
  const message = verified
    ? "Your identity has been verified. Access to medicines intelligence requires a separately approved organisation, customer seat, and subscription. No workspace or paid access has been granted."
    : "We could not complete this sign-in securely. Please start a new sign-in from NovaPharm Intelligence.";
  // Fixed server-authored markup: no user-controlled values or identity tokens are rendered.
  const document = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | NovaPharm Intelligence</title><style>body{margin:0;background:#f5f5f7;color:#1d1d1f;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.shell{max-width:680px;margin:13vh auto;padding:36px}.brand{font-size:14px;font-weight:650;letter-spacing:.03em}.panel{background:#fff;border-radius:26px;padding:clamp(24px,6vw,60px);margin-top:22px;box-shadow:0 12px 48px #0000000b}h1{font-size:clamp(32px,5vw,52px);letter-spacing:-.045em;line-height:1.06;margin:0 0 24px}p{color:#626268;font-size:17px;line-height:1.6}a{display:inline-block;margin-top:26px;color:#0066cc;font-weight:600;text-decoration:none}a:focus-visible{outline:3px solid #0066cc;outline-offset:6px}</style></head><body><main class="shell"><div class="brand">NovaPharm Intelligence</div><section class="panel"><h1>${title}</h1><p>${message}</p><a href="/">Return to the Medicines Terminal</a></section></main></body></html>`;
  return new NextResponse(document, {
    status: verified ? 200 : 401,
    headers: { ...securityHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
}

/**
 * Confirms a Cognito *identity* only. A JWT cannot bootstrap a tenant,
 * contract, application session, medicine permission, or subscription.
 */
export async function GET(request: NextRequest): Promise<Response> {
  let response: NextResponse;
  try {
    const code = request.nextUrl.searchParams.get("code") ?? "";
    const state = request.nextUrl.searchParams.get("state") ?? "";
    const transaction = verifyCustomerLoginTransaction({
      cookieValue: request.cookies.get("__Host-npi_oidc_tx")?.value ?? "",
      state,
      signingKey: process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"] ?? "",
    });
    const idToken = await exchangeCustomerAuthCode({ code, verifier: transaction.verifier });
    const identity = await verifyIntelligenceCustomerIdToken({ idToken, expectedNonce: transaction.nonce });
    if (identity.grantsTenantAccess !== false || identity.identityVerified !== true) throw new Error("Identity acceptance denied.");
    response = resultPage(true);
  } catch {
    response = resultPage(false);
  }
  response.cookies.set({
    name: "__Host-npi_oidc_tx",
    value: "",
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 0,
  });
  return response;
}
