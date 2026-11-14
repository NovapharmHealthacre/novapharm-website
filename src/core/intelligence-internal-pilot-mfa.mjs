/**
 * One narrowly operator-enrolled internal pilot identity can establish its OWN
 * Cognito TOTP factor after password authentication. This is not a founder,
 * enterprise, customer, paid or medicine-data session. It cannot approve an
 * email, membership, subscription, rights grant or any access itself.
 *
 * Separate cookie key-domain, purpose and route ensure this cannot be
 * substituted for the founder MFA flow. All operations use the user's Cognito
 * access token (not an administrative AWS credential).
 */
import { createHash, createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { cognitoUserAction } from "./intelligence-founder-totp-enrolment.mjs";

const TTL_MS = 600_000;
const AAD = "intelligence.novapharmhealthcare.com/auth/internal/mfa/setup";
const EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/u;
const SUBJECT = /^[A-Za-z0-9-]{8,128}$/u;
const TOKEN = /^[A-Za-z0-9._~-]{128,16000}$/u;
const CSRF = /^[A-Za-z0-9_-]{43}$/u;
const SECRET = /^[A-Z2-7]{16,128}$/u;
const fail = () => Object.assign(new Error("Internal pilot MFA setup unavailable."), { code:"pilot_mfa_denied" });
function allowedEmail(value) {
  if (typeof value !== "string" || value.length > 254 || !EMAIL.test(value)) throw fail();
  return value.toLowerCase();
}
function keyFor(secret) {
  if (typeof secret !== "string" || secret.length < 32) throw fail();
  return createHash("sha256").update("novapharm/internal-pilot-totp/v1\u0000").update(secret).digest();
}
export async function checkInternalPilotUnenrolled({
  accessToken, subject, expectedEmail, fetchImpl,
} = {}) {
  if (!TOKEN.test(accessToken ?? "") || !SUBJECT.test(subject ?? "")) throw fail();
  const expected = allowedEmail(expectedEmail);
  const user = await cognitoUserAction("GetUser", { AccessToken: accessToken }, fetchImpl);
  const attrs = Array.isArray(user?.UserAttributes) ? user.UserAttributes : [];
  const values = name => attrs.find(attr => attr?.Name === name)?.Value;
  if (values("sub") !== subject ||
      values("email")?.toLowerCase() !== expected ||
      values("email_verified") !== "true" ||
      (Array.isArray(user.UserMFASettingList) && user.UserMFASettingList.length > 0) ||
      user.PreferredMfaSetting) throw fail();
  return Object.freeze({ eligible: true, customerAccessGranted: false, founderAccessGranted: false });
}
export function createInternalPilotMfaCookie({
  accessToken, subject, expectedEmail, signingKey, nowMs = Date.now(),
} = {}) {
  if (!TOKEN.test(accessToken ?? "") || !SUBJECT.test(subject ?? "") ||
      !Number.isSafeInteger(nowMs) || nowMs <= 0) throw fail();
  const email = allowedEmail(expectedEmail);
  const key = keyFor(signingKey);
  const csrf = randomBytes(32).toString("base64url");
  const plaintext = JSON.stringify({
    version: 1, purpose: "internal_pilot_totp_enrolment_only",
    accessToken, subject, expectedEmail: email, csrf, expiresAt: nowMs + TTL_MS,
  });
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(AAD));
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const cookieValue = ["v1", iv.toString("base64url"),encrypted.toString("base64url"),
    cipher.getAuthTag().toString("base64url")].join(".");
  if (cookieValue.length > 3800) throw fail();
  return Object.freeze({ cookieValue, maxAgeSeconds: TTL_MS / 1000,
    customerAccessGranted: false, founderAccessGranted: false });
}
export function verifyInternalPilotMfaCookie({
  cookieValue, expectedEmail, signingKey, nowMs = Date.now(),
} = {}) {
  if (typeof cookieValue !== "string" || cookieValue.length > 3800 ||
      !/^v1\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{100,3400}\.[A-Za-z0-9_-]{22}$/u.test(cookieValue) ||
      !Number.isSafeInteger(nowMs)) throw fail();
  const expected = allowedEmail(expectedEmail);
  const key = keyFor(signingKey);
  const [,n,encrypted,tag] = cookieValue.split(".");
  // Reject non-canonical base64url encodings, including variations of
  // unused trailing bits that decode to the same authenticated tag.
  for (const part of [n, encrypted, tag]) {
    if (Buffer.from(part, "base64url").toString("base64url") !== part) throw fail();
  }
  let p;
  try {
    const decipher = createDecipheriv("aes-256-gcm",key,Buffer.from(n,"base64url"));
    decipher.setAAD(Buffer.from(AAD));
    decipher.setAuthTag(Buffer.from(tag,"base64url"));
    p = JSON.parse(Buffer.concat([
      decipher.update(Buffer.from(encrypted,"base64url")),decipher.final(),
    ]).toString("utf8"));
  } catch { throw fail(); }
  if (p.version !== 1 || p.purpose !== "internal_pilot_totp_enrolment_only" ||
      !TOKEN.test(p.accessToken ?? "") || !SUBJECT.test(p.subject ?? "") ||
      !CSRF.test(p.csrf ?? "") || p.expectedEmail !== expected ||
      !Number.isSafeInteger(p.expiresAt) ||
      p.expiresAt < nowMs || p.expiresAt > nowMs + TTL_MS) throw fail();
  return Object.freeze({ accessToken: p.accessToken, subject:p.subject,
    expectedEmail: expected, csrf:p.csrf });
}
export async function beginInternalPilotTotp({
  accessToken, subject, expectedEmail, fetchImpl,
} = {}) {
  await checkInternalPilotUnenrolled({ accessToken, subject, expectedEmail, fetchImpl });
  const result = await cognitoUserAction("AssociateSoftwareToken", { AccessToken:accessToken }, fetchImpl);
  if (!SECRET.test(result.SecretCode ?? "")) throw fail();
  return result.SecretCode;
}
export async function confirmInternalPilotTotp({
  accessToken, subject, expectedEmail, userCode, fetchImpl,
} = {}) {
  if (typeof userCode !== "string" || !/^\d{6}$/u.test(userCode)) throw fail();
  await checkInternalPilotUnenrolled({ accessToken, subject, expectedEmail, fetchImpl });
  const result = await cognitoUserAction("VerifySoftwareToken", {
    AccessToken:accessToken, UserCode:userCode,
    FriendlyDeviceName:"NovaPharm Intelligence internal pilot",
  }, fetchImpl);
  if (result.Status !== "SUCCESS") throw fail();
  await cognitoUserAction("SetUserMFAPreference", {
    AccessToken:accessToken, SoftwareTokenMfaSettings:{ Enabled:true, PreferredMfa:true },
  }, fetchImpl);
  return Object.freeze({ enrolled:true, customerAccessGranted:false, founderAccessGranted:false,
    identityAccepted:false, requiresFreshSignIn:true });
}
