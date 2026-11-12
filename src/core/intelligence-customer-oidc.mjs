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
// The Cognito authentication ceremony may include mandatory initial TOTP setup.
// Keep the signed ID token fresh and require pwd + otp + mfa at completion.
const MAX_AUTH_AGE_SECONDS = 900;
const VALID_RANDOM = /^[A-Za-z0-9_-]{40,128}$/u;

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
export function createCustomerLoginTransaction({ signingKey, nowMs = Date.now() } = {}) {
  requireKey(signingKey);
  if (!Number.isSafeInteger(nowMs) || nowMs <= 0) throw blocked("invalid_clock");
  const state = randomBytes(32).toString("base64url");
  const nonce = randomBytes(32).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const raw = Buffer.from(JSON.stringify({ state, nonce, verifier, createdAt: nowMs }), "utf8").toString("base64url");
  const url = new URL("/oauth2/authorize", OIDC_DOMAIN);
  const params = {
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: CALLBACK,
    scope: "openid email profile",
    code_challenge_method: "S256",
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    state,
    nonce,
    acr_values: REQUIRED_ACR,
    max_age: String(MAX_AUTH_AGE_SECONDS),
  };
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return Object.freeze({
    authorizeUrl: url.toString(),
    transactionCookieValue: raw + "." + sign(signingKey, raw),
    cookieMaxAgeSeconds: AGE_MS / 1000,
    identityOnly: true,
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
  return Object.freeze({ verifier: decoded.verifier, nonce: decoded.nonce, grantsTenantAccess: false });
}

async function boundedJson(response, max = 80_000) {
  if (!response?.ok || typeof response.text !== "function") throw blocked("identity_provider_unavailable");
  const raw = await response.text();
  if (raw.length > max) throw blocked("identity_response_too_large");
  try { return JSON.parse(raw); } catch { throw blocked("identity_response_invalid"); }
}

export async function exchangeCustomerAuthCode({ code, verifier, fetchImpl = globalThis.fetch } = {}) {
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
  // No refresh/access tokens are returned from this boundary.
  return tokens.id_token;
}

/**
 * JWT validation must verify the issuer's exact RSA JWKS; never trust
 * decode-only claims, arbitrary URLs, email/role metadata or unsigned tokens.
 */
export async function verifyIntelligenceCustomerIdToken({
  idToken, expectedNonce, fetchImpl = globalThis.fetch,
  nowSeconds = Math.floor(Date.now() / 1000),
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
