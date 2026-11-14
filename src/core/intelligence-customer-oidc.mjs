/**
 * NovaPharm Intelligence production customer OIDC identity verification.
 * Dedicated pool only. Server-side use; no public login route or access grant.
 *
 * IMPORTANT: A valid Cognito ID token is only proof of IdP identity, NOT
 * evidence of a customer contract, tenant ownership, seat entitlement, paid
 * subscription, an application session, or permission to query medicines.
 */
import { createHash, createHmac, createPublicKey, randomBytes, timingSafeEqual, verify } from "node:crypto";

const OIDC_DOMAIN = "https://novapharm-intelligence-production-eun1.auth.eu-north-1.amazoncognito.com";
const OIDC_ISSUER = "https://cognito-idp.eu-north-1.amazonaws.com/eu-north-1_jBL6hCUE2";
const CLIENT_ID = "7c76122stt76k4d8cjvd7tf6ck";
const CALLBACK = "https://intelligence.novapharmhealthcare.com/auth/callback";
// Allow password rotation and first-time authenticator enrolment without
// discarding the signed PKCE transaction; still expires after 15 minutes.
const AGE_MS = 900_000;
const REQUIRED_ACR = "urn:cognito:loa:4";
// Cognito may need a lower provider request only to start first-time TOTP setup.
// The callback still rejects this level for identity, sessions and all access.
const INITIAL_ENROLMENT_ACR_FALLBACK = "urn:cognito:loa:1";
// The Cognito authentication ceremony may include mandatory initial TOTP setup.
// Keep the signed ID token fresh and require pwd + otp + mfa at completion.
const MAX_AUTH_AGE_SECONDS = 900;
const VALID_RANDOM = /^[A-Za-z0-9_-]{40,128}$/u;
const APPROVED_SELF_SERVICE_PLANS = Object.freeze(["starter", "professional"]);
const APPROVED_BILLING_CYCLES = Object.freeze(["monthly", "annual"]);

function requestedBillingSelection(plan, cycle) {
  if (plan === undefined && cycle === undefined) return null;
  // Browser-provided pricing intent is never a Stripe price, tenant, contract,
  // or entitlement. Bind only the four approved choices to the HMAC cookie.
  if (typeof plan !== "string" || typeof cycle !== "string" ||
      !APPROVED_SELF_SERVICE_PLANS.includes(plan) ||
      !APPROVED_BILLING_CYCLES.includes(cycle)) {
    throw blocked("customer_plan_selection_invalid");
  }
  return Object.freeze({ plan, cycle });
}

function blocked(code) {
  return Object.assign(new Error("Intelligence customer identity is unavailable."), { code });
}

function sign(key, raw) {
  return createHmac("sha256", key).update(raw).digest("base64url");
}

function requireKey(key) {
  if (typeof key !== "string" || key.length < 32) throw blocked("transaction_signing_key_unavailable");
}

export const intelligenceCustomerOidc = Object.freeze({
  issuer: OIDC_ISSUER,
  clientId: CLIENT_ID,
  domain: OIDC_DOMAIN,
  callback: CALLBACK,
  requiresTenantAcceptance: true,
  permitsPublicSignup: false,
});

/**
 * Bind start and callback with HttpOnly, Secure, SameSite=Lax cookie,
 * path=/, Max-Age=900. Cookie is signed, not encrypted, and does not
 * include any tenant, user, or clinical data.
 */
export function createCustomerLoginTransaction({
  signingKey, nowMs = Date.now(), requestedPlan, requestedCycle,
} = {}) {
  requireKey(signingKey);
  if (!Number.isSafeInteger(nowMs) || nowMs <= 0) throw blocked("invalid_clock");
  const selection = requestedBillingSelection(requestedPlan, requestedCycle);
  const state = randomBytes(32).toString("base64url");
  const nonce = randomBytes(32).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const transaction = {
    state, nonce, verifier, createdAt: nowMs,
    ...(selection ? { requestedPlan: selection.plan, requestedCycle: selection.cycle } : {}),
  };
  const raw = Buffer.from(JSON.stringify(transaction), "utf8").toString("base64url");
  const url = new URL("/oauth2/authorize", OIDC_DOMAIN);
  const params = {
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: CALLBACK,
    // User-admin scope permits only self-service Cognito identity operations;
    // it is never a NovaPharm customer entitlement or administrator role.
    scope: "openid email profile aws.cognito.signin.user.admin",
    code_challenge_method: "S256",
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    state,
    nonce,
    acr_values: [REQUIRED_ACR, INITIAL_ENROLMENT_ACR_FALLBACK].join(" "),
    // Cognito managed-login SSO can replay the pre-enrolment session even
    // after TOTP is activated. Force an actual new authentication ceremony
    // instead of silently accepting an old password-only Cognito cookie.
    // This is not an MFA bypass: strict ACR4/AMR checks remain mandatory.
    prompt: "login",
    max_age: "0",
  };
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return Object.freeze({
    authorizeUrl: url.toString(),
    transactionCookieValue: raw + "." + sign(signingKey, raw),
    cookieMaxAgeSeconds: AGE_MS / 1000,
    identityOnly: true,
    requestedPlanBoundToSignedCookie: selection !== null,
    grantsTenantAccess: false,
  });
}

export function verifyCustomerLoginTransaction({ cookieValue, state, signingKey, nowMs = Date.now() } = {}) {
  requireKey(signingKey);
  if (typeof cookieValue !== "string" || cookieValue.length > 2048 ||
      typeof state !== "string" || !VALID_RANDOM.test(state)) throw blocked("transaction_invalid");
  const pieces = cookieValue.split(".");
  if (pieces.length !== 2 || !/^[A-Za-z0-9_-]+$/u.test(pieces[0]) ||
      !/^[A-Za-z0-9_-]{43}$/u.test(pieces[1])) throw blocked("transaction_invalid");
  const received = Buffer.from(pieces[1], "base64url");
  const expected = Buffer.from(sign(signingKey, pieces[0]), "base64url");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) throw blocked("transaction_invalid");
  let decoded;
  try { decoded = JSON.parse(Buffer.from(pieces[0], "base64url").toString("utf8")); }
  catch { throw blocked("transaction_invalid"); }
  if (!decoded || decoded.state !== state || !VALID_RANDOM.test(String(decoded.nonce || "")) ||
      !VALID_RANDOM.test(String(decoded.verifier || "")) ||
      !Number.isSafeInteger(decoded.createdAt) || decoded.createdAt > nowMs ||
      nowMs - decoded.createdAt > AGE_MS) throw blocked("transaction_expired_or_mismatched");
  // Only independently verified HMAC data can supply this commercial intent
  // after OAuth. No downstream paid Checkout or account grant is implied.
  const selection = requestedBillingSelection(decoded.requestedPlan, decoded.requestedCycle);
  return Object.freeze({
    verifier: decoded.verifier, nonce: decoded.nonce,
    createdAtMs: decoded.createdAt,
    requestedPlan: selection?.plan ?? null,
    requestedCycle: selection?.cycle ?? null,
    grantsTenantAccess: false,
  });
}

async function boundedJson(response, max = 80_000) {
  if (!response?.ok || typeof response.text !== "function") throw blocked("identity_provider_unavailable");
  const raw = await response.text();
  if (raw.length > max) throw blocked("identity_response_too_large");
  try { return JSON.parse(raw); } catch { throw blocked("identity_response_invalid"); }
}

export async function exchangeCustomerAuthTokens({ code, verifier, fetchImpl = globalThis.fetch } = {}) {
  if (typeof code !== "string" || !/^[A-Za-z0-9._~-]{8,2048}$/u.test(code) ||
      typeof verifier !== "string" || !VALID_RANDOM.test(verifier) ||
      typeof fetchImpl !== "function") throw blocked("authorization_code_invalid");
  const body = new URLSearchParams({
    grant_type: "authorization_code", code,
    client_id: CLIENT_ID, redirect_uri: CALLBACK, code_verifier: verifier,
  });
  const response = await fetchImpl(OIDC_DOMAIN + "/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: body.toString(),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(8000),
  });
  const tokens = await boundedJson(response, 40_000);
  if (tokens.token_type?.toLowerCase() !== "bearer" ||
      typeof tokens.id_token !== "string" || tokens.id_token.length > 16000) {
    throw blocked("identity_response_invalid");
  }
  // Only short-lived id and access token are returned to the SERVER caller.
  // Never expose either token to HTML/JavaScript, logs, redirect URLs or API.
  if (typeof tokens.access_token !== "string" ||
      tokens.access_token.length < 128 || tokens.access_token.length > 16000 ||
      !/^[A-Za-z0-9._~-]+$/u.test(tokens.access_token)) {
    throw blocked("identity_response_invalid");
  }
  return Object.freeze({ idToken: tokens.id_token, accessToken: tokens.access_token });
}

/** Legacy identity-only adapter; never returns an access token to the browser. */
export async function exchangeCustomerAuthCode(args) {
  return (await exchangeCustomerAuthTokens(args)).idToken;
}

/**
 * JWT validation must verify the issuer's exact RSA JWKS; never trust
 * decode-only claims, arbitrary URLs, email/role metadata or unsigned tokens.
 */
export async function verifyIntelligenceCustomerIdToken({
  idToken, expectedNonce, fetchImpl = globalThis.fetch,
  nowSeconds = Math.floor(Date.now() / 1000),
  purpose = "identity", pilotMfaEmail = null,
} = {}) {
  if (typeof idToken !== "string" || idToken.length > 16000 ||
      typeof expectedNonce !== "string" || !VALID_RANDOM.test(expectedNonce)) throw blocked("invalid_identity_token");
  const parts = idToken.split(".");
  if (parts.length !== 3 || parts.some((x) => !x || x.length > 12000)) throw blocked("invalid_identity_token");
  let header, claims;
  try {
    header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch { throw blocked("invalid_identity_token"); }
  // Cognito JWKS key identifiers are not necessarily base64url. AWS uses
  // standard base64-like kid values, including +, / and trailing = padding.
  // Keep the kid bounded and exact-match ONLY against the pinned issuer's
  // published RSA signing key. This never relaxes signature verification.
  if (header?.alg !== "RS256" || typeof header.kid !== "string" ||
      !/^[A-Za-z0-9+/=_-]{1,256}$/u.test(header.kid) ||
      typeof fetchImpl !== "function") throw blocked("identity_signature_invalid");
  const keys = await boundedJson(await fetchImpl(OIDC_ISSUER + "/.well-known/jwks.json", {
    method: "GET", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8000),
  }), 60_000);
  const jwk = Array.isArray(keys.keys) && keys.keys.find((k) =>
    k && k.kid === header.kid && k.kty === "RSA" && (!k.use || k.use === "sig") && k.alg !== "none");
  if (!jwk) throw blocked("identity_signing_key_missing");
  try {
    const key = createPublicKey({ key: jwk, format: "jwk" });
    if (!verify("RSA-SHA256", Buffer.from(parts[0] + "." + parts[1]), key, Buffer.from(parts[2], "base64url"))) {
      throw blocked("identity_signature_invalid");
    }
  } catch { throw blocked("identity_signature_invalid"); }
  // Keep all token checks fail closed, but distinguish safe classes of identity
  // rejection so production operators can diagnose onboarding without logging
  // personal claims, tokens, PKCE secrets, or OAuth codes.
  if (claims?.iss !== OIDC_ISSUER || claims.aud !== CLIENT_ID ||
      claims.token_use !== "id" || claims.nonce !== expectedNonce ||
      typeof claims.sub !== "string" || !/^[A-Za-z0-9-]{8,128}$/u.test(claims.sub) ||
      !Number.isSafeInteger(claims.exp) || claims.exp <= nowSeconds ||
      !Number.isSafeInteger(claims.iat) || claims.iat > nowSeconds + 60 ||
      !Number.isSafeInteger(nowSeconds)) throw blocked("identity_claims_invalid");
  if (claims.email_verified !== true) throw blocked("identity_email_unverified");
  if (purpose === "founder_provider_identity") {
    // AWS Cognito ACR/AMR rollout is not yet active for this production pool.
    // This represents a verified Cognito USER IDENTITY ONLY, not proof from
    // signed ACR/AMR claims and NEVER a customer session. A separate,
    // provider-enforced MFA guard + exact token-bound GetUser is required
    // before a founder-only acknowledgement may be rendered.
    // Signed, explicit insufficient-MFA claims must always fail closed.
    if (claims.email !== "vishal@novapharmhealthcare.com")
      throw blocked("provider_identity_not_founder");
    if (claims.acr !== undefined || claims.amr !== undefined)
      throw blocked("provider_identity_claims_incompatible");
    if (!Number.isSafeInteger(claims.auth_time) ||
        claims.auth_time > nowSeconds + 60 ||
        nowSeconds - claims.auth_time > 150 ||
        claims.iat < claims.auth_time ||
        nowSeconds - claims.iat > 150) {
      throw blocked("provider_identity_session_not_fresh");
    }
    return Object.freeze({
      founderProviderIdentityOnly: true,
      verifiedCognitoSubject: claims.sub,
      verifiedIssuer: OIDC_ISSUER,
      signedAuthTimeSeconds: claims.auth_time,
      signedIssuedAtSeconds: claims.iat,
      identityVerified: false,
      mfaVerifiedInSignedClaims: false,
      grantsTenantAccess: false,
      subscriptionVerified: false,
    });
  }
  if (purpose === "internal_pilot_mfa_enrolment") {
    // Only a server-supplied pilot allowlist may reach this restricted
    // identity bootstrap. A signed, verified Cognito account is required.
    // It NEVER becomes MFA proof, a founder account, customer seat or
    // source-rights approval, even with a valid password-only token.
    if (typeof pilotMfaEmail !== "string" ||
        !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/u.test(pilotMfaEmail) ||
        typeof claims.email !== "string" ||
        claims.email.toLowerCase() !== pilotMfaEmail.toLowerCase()) {
      throw blocked("pilot_mfa_identity_not_allowed");
    }
    if (claims.acr !== undefined &&
        !["urn:cognito:loa:1", "urn:cognito:loa:2",
          "urn:cognito:loa:3", "urn:cognito:loa:4"].includes(claims.acr)) {
      throw blocked("pilot_mfa_claims_incompatible");
    }
    if (claims.amr !== undefined &&
        (!Array.isArray(claims.amr) || claims.amr.length > 10 ||
         claims.amr.some(m => typeof m !== "string" ||
           !["pwd", "otp", "mfa", "email_otp", "sms", "swk", "hwk"].includes(m)))) {
      throw blocked("pilot_mfa_claims_incompatible");
    }
    if (!Number.isSafeInteger(claims.auth_time) ||
        claims.auth_time > nowSeconds + 60 ||
        nowSeconds - claims.auth_time > 300 ||
        claims.iat < claims.auth_time) {
      throw blocked("pilot_mfa_auth_stale");
    }
    return Object.freeze({
      pilotMfaEnrolmentOnly: true, verifiedCognitoSubject: claims.sub,
      identityVerified: false, mfaVerified: false,
      grantsTenantAccess: false, grantsFounderAccess: false,
      subscriptionVerified: false,
    });
  }
  if (purpose === "mfa_enrolment") {
    // This is a narrow first-time authenticator REGISTRATION only, never
    // normal identity, MFA verification, a customer session, or data access.
    // Amazon Cognito's ACR/AMR token-claim feature is rolling out gradually.
    // Requiring 'pwd' in optional AMR blocks users who successfully signed
    // in but whose pool does not emit a password-method claim. The actual
    // founder principal and access token are independently checked by
    // Cognito GetUser before issuing an enrolment-only 10-minute cookie.
    // User must still register and VERIFY a TOTP before new sign-in.
    if (claims.email !== "vishal@novapharmhealthcare.com")
      throw blocked("mfa_enrolment_founder_email_mismatch");
    if (claims.amr !== undefined && (
        !Array.isArray(claims.amr) || claims.amr.length > 10 ||
        claims.amr.some(method =>
          typeof method !== "string" ||
          !["pwd", "otp", "mfa", "email_otp", "sms", "swk", "hwk"].includes(method))))
      throw blocked("mfa_enrolment_method_unrecognised");
    if (claims.acr !== undefined &&
        !["urn:cognito:loa:1", "urn:cognito:loa:2",
          "urn:cognito:loa:3", "urn:cognito:loa:4"].includes(claims.acr))
      throw blocked("mfa_enrolment_acr_incompatible");
    if (!Number.isSafeInteger(claims.auth_time) ||
        claims.auth_time > nowSeconds + 60 ||
        nowSeconds - claims.auth_time > 300)
      throw blocked("mfa_enrolment_auth_stale");
    return Object.freeze({
      mfaEnrolmentOnly: true, verifiedCognitoSubject: claims.sub,
      identityVerified: false, mfaVerified: false,
      grantsTenantAccess: false, subscriptionVerified: false,
    });
  }
  if (purpose !== "identity") throw blocked("identity_claims_invalid");
  // Cognito Essentials computes ACR/AMR from the actual factors used.
  // Do not substitute pool MFA configuration or existing TOTP enrolment for
  // a signed assertion of password + TOTP authentication on THIS sign-in.
  if (claims.acr !== REQUIRED_ACR || !Array.isArray(claims.amr) ||
      !["pwd", "otp", "mfa"].every((method) => claims.amr.includes(method))) {
    throw blocked("identity_mfa_level_insufficient");
  }
  if (!Number.isSafeInteger(claims.auth_time) ||
      claims.auth_time > nowSeconds + 60 ||
      nowSeconds - claims.auth_time > MAX_AUTH_AGE_SECONDS) {
    throw blocked("identity_auth_stale");
  }
  return Object.freeze({
    verifiedCognitoSubject: claims.sub,
    verifiedIssuer: OIDC_ISSUER,
    identityVerified: true,
    // Verified signed Cognito Essentials ACR 4 / AMR pwd+otp+mfa and fresh auth_time.
    // This proves TOTP authentication, not a customer seat or a paid contract.
    mfaVerified: true,
    mfaSessionAttestationRequired: false,
    tenantOwnershipVerified: false,
    subscriptionVerified: false,
    grantsTenantAccess: false,
  });
}
