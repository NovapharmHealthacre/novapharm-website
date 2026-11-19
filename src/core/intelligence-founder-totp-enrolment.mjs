/**
 * Founder-only, self-service first-time TOTP setup.
 *
 * Cognito can issue an authenticated ID/access token before first-time
 * TOTP enrolment, while ACR/AMR claims may be unavailable during rollout.
 * A signed founder-specific, nonce-bound, fresh Cognito identity may ONLY
 * perform Cognito's own first-time TOTP enrolment operations. Such tokens
 * are NEVER NovaPharm MFA proof, customer identity or customer acceptance.
 *
 * No AWS IAM credentials, password, refresh token or public browser JS.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const COGNITO_ENDPOINT = "https://cognito-idp.eu-north-1.amazonaws.com/";
const USER_ADMIN_SCOPE = "aws.cognito.signin.user.admin";
const ENROLMENT_MAX_AGE_MS = 600_000;
const jwtShape = /^[A-Za-z0-9._~-]{128,16000}$/u;
const subjectPattern = /^[A-Za-z0-9-]{8,128}$/u;
const secretPattern = /^[A-Z2-7]{16,128}$/u;
const csrfPattern = /^[A-Za-z0-9_-]{43}$/u;
const blocked = code => Object.assign(new Error("Secure MFA registration unavailable."), { code });
const keyFor = signingKey => {
  if (typeof signingKey !== "string" || signingKey.length < 32) throw blocked("enrolment_key_unavailable");
  return createHash("sha256").update("novapharm/cognito-totp-enrolment/v1\0").update(signingKey).digest();
};
const strictJson = async response => {
  if (!response?.ok || typeof response.text !== "function") throw blocked("cognito_mfa_request_rejected");
  const raw = await response.text();
  if (raw.length > 16000) throw blocked("cognito_mfa_response_too_large");
  try { return raw ? JSON.parse(raw) : {}; } catch { throw blocked("cognito_mfa_response_invalid"); }
};

/** Non-secret, explicit self-service Cognito operations. */
export async function cognitoUserAction(action, params, fetchImpl = globalThis.fetch) {
  if (!["GetUser","AssociateSoftwareToken","VerifySoftwareToken","SetUserMFAPreference"].includes(action) ||
      !jwtShape.test(params?.AccessToken ?? "") ||
      typeof fetchImpl !== "function") throw blocked("mfa_action_invalid");
  const res = await fetchImpl(COGNITO_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": "AWSCognitoIdentityProviderService." + action,
      Accept: "application/json",
    },
    body: JSON.stringify(params),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(8000),
  });
  return strictJson(res);
}

/**
 * Require Cognito itself to verify the access token, founder subject and
 * absence of ANY pre-existing MFA before allowing an enrolment bootstrap.
 */
export async function checkFounderUnenrolled({ accessToken, subject, fetchImpl } = {}) {
  if (!subjectPattern.test(subject ?? "")) throw blocked("founder_subject_invalid");
  const user = await cognitoUserAction("GetUser", { AccessToken: accessToken }, fetchImpl);
  const foundSub = (user.UserAttributes ?? []).find(row => row?.Name === "sub")?.Value;
  const foundEmail = (user.UserAttributes ?? []).find(row => row?.Name === "email")?.Value;
  const verified = (user.UserAttributes ?? []).find(row => row?.Name === "email_verified")?.Value;
  if (foundSub !== subject || foundEmail !== "vishal@novapharmhealthcare.com" || verified !== "true" ||
      !Array.isArray(user.UserAttributes) ||
      (Array.isArray(user.UserMFASettingList) && user.UserMFASettingList.length !== 0) ||
      user.PreferredMfaSetting) {
    throw blocked("mfa_enrolment_not_eligible");
  }
  return true;
}

/**
 * Strongly identify a previously enrolled founder without treating the
 * account's MFA enrolment as evidence of MFA on THIS OAuth transaction.
 * This function must never approve a customer or create a session.
 */
export async function checkFounderEnrolled({ accessToken, subject, fetchImpl } = {}) {
  if (!subjectPattern.test(subject ?? "")) throw blocked("founder_subject_invalid");
  const user = await cognitoUserAction("GetUser", { AccessToken: accessToken }, fetchImpl);
  const attributes = Array.isArray(user.UserAttributes) ? user.UserAttributes : [];
  const foundSub = attributes.find(row => row?.Name === "sub")?.Value;
  const foundEmail = attributes.find(row => row?.Name === "email")?.Value;
  const verified = attributes.find(row => row?.Name === "email_verified")?.Value;
  const methods = user.UserMFASettingList;
  if (foundSub !== subject || foundEmail !== "vishal@novapharmhealthcare.com" ||
      verified !== "true" || !Array.isArray(methods) ||
      !methods.includes("SOFTWARE_TOKEN_MFA") ||
      user.PreferredMfaSetting !== "SOFTWARE_TOKEN_MFA") {
    throw blocked("mfa_existing_factor_not_attested");
  }
  // MFA registered != MFA used in this sign-in. No session accepted.
  return Object.freeze({
    authenticatorRegistered: true, mfaVerifiedThisLogin: false,
    identityAccepted: false, grantsTenantAccess: false,
  });
}

/** AES-256-GCM authenticated server-only HttpOnly host cookie; 10-minute TTL. */
export function createFounderMfaCookie({ accessToken, subject, signingKey, nowMs = Date.now() } = {}) {
  if (!jwtShape.test(accessToken ?? "") || !subjectPattern.test(subject ?? "") ||
      !Number.isSafeInteger(nowMs) || nowMs <= 0) throw blocked("enrolment_invalid");
  const key = keyFor(signingKey);
  const csrf = randomBytes(32).toString("base64url");
  const payload = JSON.stringify({
    v: 1, purpose: "founder_temporary_totp_only",
    accessToken, subject, csrf, expiresAt: nowMs + ENROLMENT_MAX_AGE_MS,
  });
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  cipher.setAAD(Buffer.from("intelligence.novapharmhealthcare.com/auth/mfa/setup"));
  const encrypted = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
  const cookieValue = ["v1", nonce.toString("base64url"),
    encrypted.toString("base64url"), cipher.getAuthTag().toString("base64url")].join(".");
  if (cookieValue.length > 3800) throw blocked("enrolment_cookie_too_large");
  return Object.freeze({ cookieValue, maxAgeSeconds: ENROLMENT_MAX_AGE_MS / 1000 });
}

export function verifyFounderMfaCookie({ cookieValue, signingKey, nowMs = Date.now() } = {}) {
  if (typeof cookieValue !== "string" || cookieValue.length > 3800 ||
      !/^v1\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{100,3400}\.[A-Za-z0-9_-]{22}$/u.test(cookieValue) ||
      !Number.isSafeInteger(nowMs)) throw blocked("mfa_enrolment_cookie_invalid");
  const key = keyFor(signingKey);
  const [, n, ciphertext, tag] = cookieValue.split(".");
  let payload;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(n, "base64url"));
    decipher.setAAD(Buffer.from("intelligence.novapharmhealthcare.com/auth/mfa/setup"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()
    ]);
    payload = JSON.parse(decrypted.toString("utf8"));
  } catch { throw blocked("mfa_enrolment_cookie_invalid"); }
  if (payload.v !== 1 || payload.purpose !== "founder_temporary_totp_only" ||
      !jwtShape.test(payload.accessToken ?? "") || !subjectPattern.test(payload.subject ?? "") ||
      !csrfPattern.test(payload.csrf ?? "") ||
      !Number.isSafeInteger(payload.expiresAt) ||
      payload.expiresAt < nowMs || payload.expiresAt > nowMs + ENROLMENT_MAX_AGE_MS) {
    throw blocked("mfa_enrolment_expired_or_invalid");
  }
  return Object.freeze({
    accessToken: payload.accessToken, subject: payload.subject, csrf: payload.csrf
  });
}

/** Generate a private authenticator secret only after the user is verified as unenrolled. */
export async function beginFounderTotp({ accessToken, subject, fetchImpl } = {}) {
  await checkFounderUnenrolled({ accessToken, subject, fetchImpl });
  const response = await cognitoUserAction(
    "AssociateSoftwareToken", { AccessToken: accessToken }, fetchImpl
  );
  if (!secretPattern.test(response.SecretCode ?? "")) throw blocked("totp_secret_invalid");
  // Secret is rendered ONLY in owner HTTPS no-store HTML, never persisted.
  return response.SecretCode;
}

/** The user supplies their own six-digit authenticator code; no auto approval. */
export async function confirmFounderTotp({ accessToken, userCode, fetchImpl } = {}) {
  if (typeof userCode !== "string" || !/^\d{6}$/u.test(userCode))
    throw blocked("invalid_totp_code");
  const result = await cognitoUserAction("VerifySoftwareToken", {
    AccessToken: accessToken, UserCode: userCode,
    FriendlyDeviceName: "NovaPharm Intelligence",
  }, fetchImpl);
  if (result.Status !== "SUCCESS") throw blocked("totp_not_verified");
  await cognitoUserAction("SetUserMFAPreference", {
    AccessToken: accessToken,
    SoftwareTokenMfaSettings: { Enabled: true, PreferredMfa: true },
  }, fetchImpl);
  return Object.freeze({ enrolled: true, grantsTenantAccess: false, verifiedIdentity: false });
}

export const founderMfaSetupPolicy = Object.freeze({
  permittedScope: USER_ADMIN_SCOPE,
  requiresVerifiedCognitoFounderSession: true,
  requiresPriorMfaUnenrolled: true,
  customerAccessGranted: false,
  mustReauthenticateAfterSetup: true,
});
