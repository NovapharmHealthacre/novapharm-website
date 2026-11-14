import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  beginInternalPilotTotp,
  confirmInternalPilotTotp,
  verifyInternalPilotMfaCookie,
} from "../../../../../../../src/core/intelligence-internal-pilot-mfa.mjs";

export const dynamic = "force-dynamic";
const ORIGIN = "https://intelligence.novapharmhealthcare.com";
const headers = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache", "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY",
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
};
const shell = (title:string, body:string) =>
  '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'
  + title + ' | NovaPharm Intelligence</title><style>body{margin:0;background:#f5f5f7;color:#1d1d1f;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{max-width:620px;margin:10vh auto;padding:24px}.brand{font-size:14px;font-weight:650}article{background:#fff;border-radius:26px;padding:clamp(24px,6vw,55px);margin-top:22px;box-shadow:0 14px 50px #0000000b}h1{font-size:clamp(30px,5vw,46px);letter-spacing:-.045em;line-height:1.1}p{color:#606068;font-size:16px;line-height:1.55}.key{background:#f5f5f7;border:1px solid #dedee2;border-radius:10px;padding:14px;overflow-wrap:anywhere;font-family:ui-monospace,monospace}label{display:block;font-weight:650;margin:24px 0 10px}input{width:100%;padding:14px;font-size:19px;box-sizing:border-box;border:1px solid #cccdd2;border-radius:12px}button{margin-top:16px;background:#0071e3;border:0;border-radius:13px;color:white;padding:15px 22px;font-size:16px;font-weight:650;width:100%}a{color:#06c;text-decoration:none;font-weight:600}</style></head><body><main><div class="brand">NovaPharm Intelligence</div><article><h1>'
  + title + '</h1>' + body + '</article></main></body></html>';
const error = () => new NextResponse(shell("Authenticator setup unavailable",
  '<p>This internal test account cannot complete authenticator setup with the current secure session. Begin a new sign-in after confirming that the account is verified.</p><a href="/auth/customer/start">Start a new secure sign-in</a>'),
  { status:403, headers });
function read(request:NextRequest) {
  if (process.env["NPI_INTERNAL_PILOT_MFA_ENABLED"] !== "true") throw new Error("Disabled");
  return verifyInternalPilotMfaCookie({
    cookieValue: request.cookies.get("__Host-npi_internal_mfa")?.value ?? "",
    signingKey: process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"] ?? "",
    expectedEmail: process.env["NPI_INTERNAL_PILOT_MFA_EMAIL"] ?? "",
  });
}

/** Only a fresh, encrypted, email-verified internal pilot can start TOTP. */
export async function GET(request:NextRequest):Promise<Response> {
  let phase: "enrollment_cookie" | "cognito_enrollment" = "enrollment_cookie";
  try {
    const session = read(request);
    phase = "cognito_enrollment";
    const secret = await beginInternalPilotTotp({
      accessToken: session.accessToken, subject: session.subject,
      expectedEmail: session.expectedEmail,
    });
    const body = '<p>Use your authenticator app to enable two-factor verification. This setup does not provide customer, founder, billing or medicine-data access.</p>'
      + '<p>In Microsoft Authenticator or Google Authenticator choose <strong>Add account</strong> and enter the setup key.</p>'
      + '<p><strong>Setup key</strong></p><div class="key">' + secret + '</div>'
      + '<p>Enter the six-digit time-based code displayed by your authenticator. Do not share the key or code.</p>'
      + '<form action="/auth/internal/mfa/setup" method="post">'
      + '<input type="hidden" name="csrf" value="' + session.csrf + '">'
      + '<label for="code">Authenticator code</label>'
      + '<input id="code" name="code" type="text" autocomplete="one-time-code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" minlength="6" required>'
      + '<button type="submit">Verify and activate MFA</button></form>';
    console.info(JSON.stringify({event:"npi_internal_pilot_totp_setup_ready"}));
    return new NextResponse(shell("Secure your test account", body), {status:200, headers});
  } catch {
    // Fixed classes only: never log cookie values, Cognito tokens, usernames,
    // authenticator keys, signed claims, one-time codes or their hashes.
    console.warn(JSON.stringify({
      event:"npi_internal_pilot_totp_setup_denied",
      phase, cookiePresent:request.cookies.has("__Host-npi_internal_mfa"),
    }));
    return error();
  }
}
export async function POST(request:NextRequest):Promise<Response> {
  if (request.headers.get("origin") !== ORIGIN ||
      request.headers.get("content-type")?.split(";")[0] !== "application/x-www-form-urlencoded") return error();
  try {
    const session = read(request);
    const data = await request.formData();
    if (data.get("csrf") !== session.csrf ||
        typeof data.get("code") !== "string" || !/^[0-9]{6}$/u.test(data.get("code") as string)) return error();
    const confirmed = await confirmInternalPilotTotp({
      accessToken: session.accessToken, subject: session.subject,
      expectedEmail: session.expectedEmail, userCode: data.get("code") as string,
    });
    if (confirmed.enrolled !== true || confirmed.customerAccessGranted !== false ||
        confirmed.founderAccessGranted !== false) return error();
    const response = new NextResponse(shell("Authenticator activated",
      '<p>Your authenticator is registered. Start a fresh secure sign-in using your password and authenticator code. Your internal account still requires separate permission before any Intelligence workspace or medicine data can be accessed.</p><a href="/auth/customer/start">Start a new secure sign-in</a>'),
      {status:200, headers});
    response.cookies.set({
      name:"__Host-npi_internal_mfa", value:"", path:"/", secure:true,
      httpOnly:true, sameSite:"lax", maxAge:0,
    });
    return response;
  } catch { return error(); }
}
