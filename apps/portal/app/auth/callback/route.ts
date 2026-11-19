import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  exchangeCustomerAuthTokens,
  verifyCustomerLoginTransaction,
  verifyIntelligenceCustomerIdToken,
} from "../../../../../src/core/intelligence-customer-oidc.mjs";
import {
  acknowledgeFounderManagedMfaOnly,
} from "../../../../../src/core/intelligence-founder-managed-mfa-compat.mjs";
import {
  requestFounderPrivateSession,
} from "../../../../../src/core/intelligence-founder-private-session-bridge.mjs";
import {
  checkFounderEnrolled,
  checkFounderUnenrolled,
  createFounderMfaCookie,
} from "../../../../../src/core/intelligence-founder-totp-enrolment.mjs";
import {
  checkInternalPilotUnenrolled,
  createInternalPilotMfaCookie,
} from "../../../../../src/core/intelligence-internal-pilot-mfa.mjs";

export const dynamic = "force-dynamic";

// The API Gateway/Lambda Web Adapter forwards to an internal HTTP server.
// NextRequest.nextUrl.origin can reflect that internal origin rather than the
// already-pinned public OAuth callback origin. Never infer redirect targets
// from internal URLs, caller Host or X-Forwarded-* headers.
const FOUNDER_PUBLIC_ORIGIN = "https://intelligence.novapharmhealthcare.com";

const securityHeaders = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
} as const;

// Only these fixed classifications are allowed into operational logs. Never
// log the callback URL, authorisation code, state, PKCE cookie, JWT or email.
const safeIdentityErrorCodes = new Set([
  "transaction_signing_key_unavailable", "transaction_invalid",
  "transaction_expired_or_mismatched", "authorization_code_invalid",
  "identity_provider_unavailable", "identity_response_too_large",
  "identity_response_invalid", "invalid_identity_token",
  "identity_signature_invalid", "identity_signing_key_missing",
  "identity_claims_invalid", "identity_email_unverified",
  "identity_mfa_level_insufficient", "identity_auth_stale",
  "mfa_enrolment_not_authorised", "mfa_enrolment_not_eligible",
  "mfa_enrolment_founder_email_mismatch",
  "mfa_enrolment_password_proof_missing",
  "mfa_enrolment_method_unrecognised",
  "mfa_enrolment_acr_incompatible", "mfa_enrolment_auth_stale",
  "cognito_mfa_request_rejected", "founder_subject_invalid",
  "mfa_action_invalid", "enrolment_cookie_too_large", "enrolment_invalid",
  "enrolment_key_unavailable",
  "provider_identity_not_founder", "provider_identity_claims_incompatible",
  "provider_identity_session_not_fresh",
  "founder_provider_policy_not_attested", "founder_provider_identity_unattested",
  "founder_provider_session_not_fresh", "mfa_existing_factor_not_attested",
  "pilot_mfa_identity_not_allowed", "pilot_mfa_claims_incompatible",
  "pilot_mfa_auth_stale", "pilot_mfa_denied",
]);

function safeIdentityErrorCode(error: unknown): string {
  if (!error || typeof error !== "object" || !("code" in error)) return "unclassified";
  const code = (error as { code: unknown }).code;
  return typeof code === "string" && safeIdentityErrorCodes.has(code) ? code : "unclassified";
}

function resultPage(verified: boolean, approved = false, registeredButUnattested = false, founderProviderOnly = false, founderSessionActive = false): NextResponse {
  const title = founderSessionActive ? "Founder workspace ready" : approved ? "Business account connected" : verified ? "Identity verified"
    : founderProviderOnly ? "Cognito sign-in confirmed"
    : registeredButUnattested ? "Authenticator active" : "Sign-in could not be completed";
  const message = founderSessionActive
    ? "Your founder identity has been verified and a time-limited private workspace session is active. You can review the Medicines Terminal workspace catalogue. Research data, customer accounts, subscriptions and restricted actions remain protected by independent approval controls."
    : approved
    ? "Your organisation, customer seat, subscription and secure session are verified. Continue to your account. Medicine datasets and research features remain restricted to separately accepted source rights."
    : verified
      ? "Your identity has been verified. Access to medicines intelligence requires a separately approved organisation, customer seat, and subscription. No workspace or paid access has been granted."
      : founderProviderOnly
        ? "Cognito has completed a new sign-in under its mandatory password and authenticator policy. Your founder identity was confirmed with a signed token and the live Cognito account. This is identity-only: no NovaPharm customer session, medicines data, or subscription access has been issued."
      : registeredButUnattested
        ? "Your authenticator is registered. Cognito has not yet provided proof of password plus authenticator verification for this sign-in. Start a fresh sign-in and complete both steps. No Medicines Terminal access has been granted."
        : "We could not complete this sign-in securely. Please start a new sign-in from NovaPharm Intelligence.";
  // Fixed server-authored markup: no user-controlled values or identity tokens are rendered.
  const document = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | NovaPharm Intelligence</title><style>body{margin:0;background:#f5f5f7;color:#1d1d1f;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.shell{max-width:680px;margin:13vh auto;padding:36px}.brand{font-size:14px;font-weight:650;letter-spacing:.03em}.panel{background:#fff;border-radius:26px;padding:clamp(24px,6vw,60px);margin-top:22px;box-shadow:0 12px 48px #0000000b}h1{font-size:clamp(32px,5vw,52px);letter-spacing:-.045em;line-height:1.06;margin:0 0 24px}p{color:#626268;font-size:17px;line-height:1.6}a{display:inline-block;margin-top:26px;color:#0066cc;font-weight:600;text-decoration:none}a:focus-visible{outline:3px solid #0066cc;outline-offset:6px}</style></head><body><main class="shell"><div class="brand">NovaPharm Intelligence</div><section class="panel"><h1>${title}</h1><p>${message}</p><a href="${founderSessionActive ? "/founder" : verified || founderProviderOnly ? "/" : "/auth/customer/start"}">${founderSessionActive ? "Open the Medicines Terminal" : verified ? "Return to the Medicines Terminal" : founderProviderOnly ? "Return to the Intelligence overview" : "Start a new secure sign-in"}</a></section></main></body></html>`;
  return new NextResponse(document, {
    status: founderSessionActive || verified || registeredButUnattested || founderProviderOnly ? 200 : 401,
    headers: { ...securityHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
}


/**
 * Only our fixed production API Gateway origin can issue an account session.
 * This never trusts a redirect, caller-provided URL, or an arbitrary upstream
 * Set-Cookie. The upstream route must independently verify the Cognito JWT,
 * tenant, seat, signed subscription and revocation-fenced database transaction.
 * Feature flag OFF unless an independently accepted live release enables it.
 */
async function activateApprovedCustomerSession(idToken: string): Promise<{ token: string; seconds: number } | null> {
  if (process.env["NPI_CUSTOMER_SESSION_API_ENABLED"] !== "true") return null;
  try {
    const response = await fetch("https://intelligence.novapharmhealthcare.com/customer/session", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + idToken,
        Accept: "application/json",
      },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(7000),
    });
    if (response.status !== 200) return null;
    const cookie = response.headers.get("set-cookie") ?? "";
    const match = /^__Host-npi_session=([A-Za-z0-9_-]{43}); Path=\/; HttpOnly; Secure; SameSite=Lax; Max-Age=([0-9]{1,5})$/.exec(cookie);
    if (!match) return null;
    const seconds = Number(match[2]);
    if (!Number.isSafeInteger(seconds) || seconds < 1 || seconds > 43200) return null;
    const token = match[1];
    if (!token) return null;
    return { token, seconds };
  } catch {
    return null;
  }
}

/**
 * Confirms a Cognito *identity* only. A JWT cannot bootstrap a tenant,
 * contract, application session, medicine permission, or subscription.
 */
export async function GET(request: NextRequest): Promise<Response> {
  let response: NextResponse = resultPage(false);
  let phase = "transaction";
  // During an MFA-only redirect, send only the encrypted enrollment cookie.
  // The signed OIDC transaction cookie expires independently within 15 minutes.
  // A second Set-Cookie on the same 303 can be mishandled by intermediary adapters.
  let pilotEnrollmentRedirectIssued = false;
  try {
    const code = request.nextUrl.searchParams.get("code") ?? "";
    const state = request.nextUrl.searchParams.get("state") ?? "";
    const transaction = verifyCustomerLoginTransaction({
      cookieValue: request.cookies.get("__Host-npi_oidc_tx")?.value ?? "",
      state,
      signingKey: process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"] ?? "",
    });
    phase = "code_exchange";
    const { idToken, accessToken } = await exchangeCustomerAuthTokens({
      code, verifier: transaction.verifier,
    });
    // Check the exact operator-approved internal pilot before normal identity
    // acceptance. Some Cognito pools emit ACR/AMR values that satisfy the
    // general identity verifier even when GetUser still reports NO registered
    // authenticator. That token must never skip the pilot's real TOTP setup.
    //
    // A new signed JWT, correct nonce, verified email, fresh password sign-in,
    // pinned account subject and an unenrolled Cognito GetUser are all required.
    // This is enrollment-only: no founder/customer/medicine permission is issued.
    if (process.env["NPI_INTERNAL_PILOT_MFA_ENABLED"] === "true" &&
        typeof process.env["NPI_INTERNAL_PILOT_MFA_EMAIL"] === "string") {
      try {
        phase = "internal_pilot_mfa_preidentity_check";
        const allowedEmail = process.env["NPI_INTERNAL_PILOT_MFA_EMAIL"];
        const pilot = await verifyIntelligenceCustomerIdToken({
          idToken, expectedNonce: transaction.nonce,
          purpose: "internal_pilot_mfa_enrolment",
          pilotMfaEmail: allowedEmail,
        });
        if (!pilot.pilotMfaEnrolmentOnly || pilot.identityVerified ||
            pilot.grantsTenantAccess || pilot.grantsFounderAccess) {
          throw new Error("Restricted internal identity check failed.");
        }
        await checkInternalPilotUnenrolled({
          accessToken, subject: pilot.verifiedCognitoSubject,
          expectedEmail: allowedEmail,
        });
        const sealed = createInternalPilotMfaCookie({
          accessToken, subject: pilot.verifiedCognitoSubject,
          expectedEmail: allowedEmail,
          signingKey: process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"] ?? "",
        });
        response = NextResponse.redirect(
          new URL("/auth/internal/mfa/setup", FOUNDER_PUBLIC_ORIGIN),
          { status: 303 },
        );
        response.cookies.set({
          name: "__Host-npi_internal_mfa", value: sealed.cookieValue,
          path: "/", secure: true, httpOnly: true, sameSite: "lax",
          maxAge: sealed.maxAgeSeconds,
        });
        // Keep the OIDC transaction until its short natural expiry rather
        // than sending a second Set-Cookie alongside the enrollment cookie.
        // Authorisation codes are single-use, and this is not a login session.
        response.headers.set("Cache-Control", "no-store");
        console.info(JSON.stringify({
          event: "npi_internal_pilot_mfa_preidentity_enrolment_offered",
        }));
        return response;
      } catch (pilotError: unknown) {
        // Non-pilot users and already enrolled accounts continue through
        // the unchanged signed identity/founder checks. Never log JWTs,
        // emails, OIDC codes, cookies, authenticator secrets or OTPs.
        console.info(JSON.stringify({
          event: "npi_internal_pilot_mfa_preidentity_denied",
          reason: safeIdentityErrorCode(pilotError),
        }));
      }
    }
    phase = "id_token_verification";
    let identity: { grantsTenantAccess: boolean; identityVerified: boolean; verifiedCognitoSubject?: string } | undefined;
    try {
      identity = await verifyIntelligenceCustomerIdToken({
        idToken, expectedNonce: transaction.nonce,
      });
    } catch (error: unknown) {
      // A Cognito password-only first sign-in can return valid tokens before
      // the user has enrolled MFA. Never accept it as a verified customer.
      if (!error || typeof error !== "object" ||
          !("code" in error) || error.code !== "identity_mfa_level_insufficient") throw error;
      // The exact OIDC callback URI and code/PKCE/state/nonce have already
      // been validated by Cognito and the server. Do not reject a legitimate
      // MFA bootstrap because Lambda's internal URL differs from the public
      // deployment origin.
      // A signed, email-verified internal pilot may bootstrap ONLY its own
      // Cognito authenticator. No founder or customer identity is issued.
      // All other users follow the unchanged founder path below.
      let pilotMfaOffered = false;
      if (process.env["NPI_INTERNAL_PILOT_MFA_ENABLED"] === "true" &&
          typeof process.env["NPI_INTERNAL_PILOT_MFA_EMAIL"] === "string") {
        try {
          const allowedEmail = process.env["NPI_INTERNAL_PILOT_MFA_EMAIL"];
          const pilot = await verifyIntelligenceCustomerIdToken({
            idToken, expectedNonce: transaction.nonce,
            purpose: "internal_pilot_mfa_enrolment",
            pilotMfaEmail: allowedEmail,
          });
          if (!pilot.pilotMfaEnrolmentOnly || pilot.identityVerified ||
              pilot.grantsTenantAccess || pilot.grantsFounderAccess) {
            throw new Error("Restricted pilot identity denied.");
          }
          await checkInternalPilotUnenrolled({
            accessToken, subject: pilot.verifiedCognitoSubject,
            expectedEmail: allowedEmail,
          });
          const sealed = createInternalPilotMfaCookie({
            accessToken, subject: pilot.verifiedCognitoSubject,
            expectedEmail: allowedEmail,
            signingKey: process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"] ?? "",
          });
          response = NextResponse.redirect(
            new URL("/auth/internal/mfa/setup", FOUNDER_PUBLIC_ORIGIN),
            { status: 303 },
          );
          response.cookies.set({
            name: "__Host-npi_internal_mfa", value: sealed.cookieValue,
            path: "/", secure: true, httpOnly: true, sameSite: "lax",
            maxAge: sealed.maxAgeSeconds,
          });
          response.headers.set("Cache-Control", "no-store");
          pilotMfaOffered = true;
          pilotEnrollmentRedirectIssued = true;
          console.info(JSON.stringify({ event:"npi_internal_pilot_mfa_enrolment_offered" }));
        } catch (pilotError: unknown) {
          console.info(JSON.stringify({
            event:"npi_internal_pilot_mfa_enrolment_denied",
            reason: safeIdentityErrorCode(pilotError),
          }));
        }
      }
      if (!pilotMfaOffered) {
      phase = "provider_managed_mfa_identity";
      let providerFounderOnly = false;
      try {
        // Strict first-party Cognito RS256 identity, new nonce, fresh auth_time
        // and NO contradictory signed ACR/AMR claims. This fallback NEVER
        // activates the customer session even if a future feature flag is on.
        const signed = await verifyIntelligenceCustomerIdToken({
          idToken, expectedNonce: transaction.nonce,
          purpose: "founder_provider_identity",
        });
        phase = "provider_managed_mfa_factor";
        const enrolled = await checkFounderEnrolled({
          accessToken, subject: signed.verifiedCognitoSubject,
        });
        const acknowledged = acknowledgeFounderManagedMfaOnly({
          signedFounderIdentity: signed,
          cognitoEnrolledFounder: enrolled,
          transactionCreatedAtMs: transaction.createdAtMs,
        });
        if (!acknowledged.cognitoFounderAuthenticated ||
            acknowledged.applicationSessionIssued ||
            acknowledged.customerAccessGranted ||
            acknowledged.mfaProofInSignedToken) {
          throw new Error("Unsafe identity-only acknowledgement.");
        }
        providerFounderOnly = true;
        const founderSession = await requestFounderPrivateSession({
          idToken, accessToken,
          bridgeKey: process.env["NPI_FOUNDER_BRIDGE_KEY"] ?? "",
        });
        response = resultPage(false, false, false, true, founderSession !== null);
        if (founderSession) {
          response.cookies.set({
            name: "__Host-npi_founder", value: founderSession.token,
            path: "/", secure: true, httpOnly: true,
            sameSite: "lax", maxAge: founderSession.maxAge,
          });
          console.info(JSON.stringify({ event: "npi_founder_shell_session_issued" }));
        }
        console.info(JSON.stringify({
          event: "npi_founder_managed_cognito_identity_only_confirmed",
        }));
      } catch (compatibilityError: unknown) {
        // No PII/JWT/OTP is logged: allowlisted error CLASS only.
        console.info(JSON.stringify({
          event: "npi_founder_provider_compatibility_denied",
          reason: safeIdentityErrorCode(compatibilityError),
        }));
        // First-time founders still need TOTP enrolment. Explicit signed
        // weak claims and stale identities remain fail closed.
        providerFounderOnly = false;
      }
      if (!providerFounderOnly) {
      phase = "mfa_enrolment_identity";
      const pending = await verifyIntelligenceCustomerIdToken({
        idToken, expectedNonce: transaction.nonce, purpose: "mfa_enrolment",
      });
      if (!pending.mfaEnrolmentOnly || pending.identityVerified ||
          pending.grantsTenantAccess) throw new Error("Enrolment identity not eligible.");
      phase = "mfa_enrolment_eligibility";
      let alreadyEnrolled = false;
      try {
        await checkFounderUnenrolled({
          accessToken, subject: pending.verifiedCognitoSubject,
        });
      } catch (reason: unknown) {
        if (!reason || typeof reason !== "object" || !("code" in reason) ||
            reason.code !== "mfa_enrolment_not_eligible") throw reason;
        // A real MFA device is already registered. Never enrol/replace
        // it, and NEVER treat its registration as proof it was used now.
        phase = "mfa_registered_but_not_attested";
        const existing = await checkFounderEnrolled({
          accessToken, subject: pending.verifiedCognitoSubject,
        });
        if (!existing.authenticatorRegistered || existing.mfaVerifiedThisLogin ||
            existing.grantsTenantAccess) throw new Error("Unsafe MFA status.");
        alreadyEnrolled = true;
        response = resultPage(false, false, true);
        console.info(JSON.stringify({ event: "npi_registered_mfa_reauthentication_required" }));
      }
      if (!alreadyEnrolled) {
        const sealed = createFounderMfaCookie({
          accessToken, subject: pending.verifiedCognitoSubject,
          signingKey: process.env["NPI_OIDC_TRANSACTION_SIGNING_KEY"] ?? "",
        });
        response = NextResponse.redirect(
          new URL("/auth/mfa/setup", FOUNDER_PUBLIC_ORIGIN), { status: 303 },
        );
        response.cookies.set({
          name: "__Host-npi_mfa_enrol",
          value: sealed.cookieValue,
          path: "/",
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          maxAge: sealed.maxAgeSeconds,
        });
        response.headers.set("Cache-Control", "no-store");
        console.info(JSON.stringify({ event: "npi_founder_totp_enrolment_offered" }));
      }
      }
      } // All other sign-ins retain the existing founder-only flow.
    }
    if (identity) {
      if (identity.grantsTenantAccess !== false || identity.identityVerified !== true)
        throw new Error("Identity acceptance denied.");
      // Identity and MFA were independently verified by signed Cognito JWT
      // and nonce. Separately identify the pinned founder via live GetUser;
      // factor registration alone is NEVER sufficient to issue a session.
      // The private founder Lambda still performs its own signed-claims,
      // factor, HMAC and revocation-fenced issuance checks.
      let founderMatched = false;
      if (typeof identity.verifiedCognitoSubject === "string") {
        try {
          const registered = await checkFounderEnrolled({
            accessToken, subject: identity.verifiedCognitoSubject,
          });
          founderMatched = registered.authenticatorRegistered === true &&
            registered.mfaVerifiedThisLogin === false &&
            registered.grantsTenantAccess === false;
        } catch {
          // Not a verified founder or provider lookup unavailable. No
          // automatic privileges, and ordinary customer access remains
          // subject to its own independent tenant and subscription gate.
        }
      }
      if (founderMatched) {
        phase = "verified_founder_session";
        const founderSession = await requestFounderPrivateSession({
          idToken, accessToken,
          bridgeKey: process.env["NPI_FOUNDER_BRIDGE_KEY"] ?? "",
        });
        response = resultPage(false, false, false, true, founderSession !== null);
        if (founderSession) {
          response.cookies.set({
            name: "__Host-npi_founder", value: founderSession.token,
            path: "/", secure: true, httpOnly: true,
            sameSite: "lax", maxAge: founderSession.maxAge,
          });
          console.info(JSON.stringify({ event: "npi_founder_shell_session_issued" }));
        } else {
          console.info(JSON.stringify({ event: "npi_founder_session_not_issued" }));
        }
      } else {
        // Never issue a customer cookie without independently approved tenant,
        // subscription, rights and revocation-fenced acceptance.
        const approved = request.nextUrl.hostname === "intelligence.novapharmhealthcare.com"
          ? await activateApprovedCustomerSession(idToken)
          : null;
        response = resultPage(true, approved !== null);
        if (approved) {
          response.cookies.set({
            name: "__Host-npi_session",
            value: approved.token,
            path: "/",
            httpOnly: true,
            secure: true,
            sameSite: "lax",
            maxAge: approved.seconds,
          });
        }
      }
    }
  } catch (error: unknown) {
    console.warn(JSON.stringify({
      event: "npi_customer_oidc_callback_denied",
      phase,
      reason: safeIdentityErrorCode(error),
    }));
    response = resultPage(false);
  }
  if (!pilotEnrollmentRedirectIssued) {
    response.cookies.set({
      name: "__Host-npi_oidc_tx",
      value: "",
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 0,
    });
  }
  return response;
}
