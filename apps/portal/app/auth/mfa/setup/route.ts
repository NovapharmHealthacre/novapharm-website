import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  beginFounderTotp,
  confirmFounderTotp,
  verifyFounderMfaCookie,
} from "../../../../../../src/core/intelligence-founder-totp-enrolment.mjs";

export const dynamic = "force-dynamic";

const domain = "https://intelligence.novapharmhealthcare.com";
const headers = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
};
const shell = (title: string, content: string) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | NovaPharm Intelligence</title><style>
  body{margin:0;background:#f5f5f7;color:#1d1d1f;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
  main{max-width:640px;padding:30px;margin:9vh auto}
  .brand{font-size:14px;font-weight:650;letter-spacing:.015em}
  article{background:#fff;padding:clamp(24px,6vw,54px);margin-top:22px;border-radius:28px;box-shadow:0 14px 52px #0000000b}
  h1{font-size:clamp(32px,5vw,46px);line-height:1.1;letter-spacing:-.045em;margin:0 0 20px}
  p{color:#66666b;line-height:1.55;font-size:16px}
  .key{background:#f5f5f7;border:1px solid #dedee2;border-radius:12px;padding:14px;overflow-wrap:anywhere;font-family:ui-monospace,monospace;font-size:18px;letter-spacing:.05em;color:#1d1d1f}
  label{display:block;font-weight:650;margin:24px 0 10px}
  input{width:100%;box-sizing:border-box;border:1px solid #cccdd2;border-radius:12px;padding:15px;font-size:18px;letter-spacing:.1em}
  button{margin-top:16px;background:#0071e3;border:0;border-radius:13px;color:#fff;font-size:16px;font-weight:650;padding:15px 24px;width:100%;cursor:pointer}
  a{color:#0066cc;text-decoration:none;font-weight:650}
  </style></head><body><main><div class="brand">NovaPharm Intelligence</div><article><h1>${title}</h1>${content}</article></main></body></html>`;
const errorPage = () => new NextResponse(shell("Authenticator setup unavailable",
  '<p>Your secure enrolment session could not be completed. Start a new sign-in to try again. No account or medicines access has been granted.</p><p><a href="/auth/customer/start">Start a new secure sign-in</a></p>'),
  {status:403, headers});
const read = (request: NextRequest) => verifyFounderMfaCookie({
  cookieValue: request.cookies.get("__Host-npi_mfa_enrol")?.value ?? "",
  signingKey: process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"] ?? "",
});

/** Founder-only Cognito TOTP setup: never a customer application session. */
export async function GET(request: NextRequest): Promise<Response> {
  // API Gateway can hand Next.js an internal URL, not the public origin.
  // This route requires the authenticated AES-GCM MFA cookie and Cognito
  // subject check; origin string comparison is not a credential.
  // Responses are fixed to the production host by API Gateway routing.

  try {
    const session = read(request);
    // Only AWS Cognito can issue this key to an authenticated, MFA-unenrolled
    // principal; the application itself does not generate a device secret.
    const secret = await beginFounderTotp({
      accessToken: session.accessToken, subject: session.subject,
    });
    const page = shell("Secure your account",
      `<p>Set up an authenticator app to protect your founder account. Your login is not complete until you confirm a code.</p>
      <p>In Microsoft Authenticator, Google Authenticator or another TOTP app, select <strong>Add account</strong>, then <strong>Enter a setup key</strong>.</p>
      <p><strong>Setup key</strong></p><div class="key">${secret}</div>
      <p>Use a time-based six-digit code. Do not share this key or the code with anyone.</p>
      <form action="/auth/mfa/setup" method="post">
      <input type="hidden" name="csrf" value="${session.csrf}">
      <label for="code">Authenticator code</label>
      <input id="code" type="text" name="code" required inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" minlength="6">
      <button type="submit">Verify and activate MFA</button>
      </form>`);
    return new NextResponse(page, { status:200, headers });
  } catch {
    return errorPage();
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  // CSRF protection uses the browser-supplied Origin header, NOT the
  // possibly-internal server URL created by Lambda Web Adapter.
  if (request.headers.get("origin") !== domain ||
      request.headers.get("content-type")?.split(";")[0] !== "application/x-www-form-urlencoded") {
    return errorPage();
  }
  try {
    const session = read(request);
    const form = await request.formData();
    const csrf = form.get("csrf");
    const code = form.get("code");
    if (typeof csrf !== "string" || csrf !== session.csrf ||
        typeof code !== "string" || !/^\d{6}$/u.test(code)) return errorPage();
    const result = await confirmFounderTotp({ accessToken: session.accessToken, userCode: code });
    if (!result.enrolled || result.grantsTenantAccess || result.verifiedIdentity) return errorPage();
    const response = new NextResponse(shell("Authenticator activated",
      '<p>Your TOTP authenticator has been registered with Amazon Cognito. This setup did not sign you into the Medicines Terminal or grant access to medicine data.</p><p>Sign in again with your password and authenticator code.</p><p><a href="/auth/customer/start">Start a new secure sign-in</a></p>'),
      {status:200, headers});
    response.cookies.set({
      name:"__Host-npi_mfa_enrol", value:"", path:"/", httpOnly:true,
      secure:true, sameSite:"lax", maxAge:0,
    });
    return response;
  } catch {
    return errorPage();
  }
}
