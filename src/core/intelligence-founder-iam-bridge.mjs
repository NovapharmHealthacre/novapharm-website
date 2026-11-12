/**
 * Private founder session issuance through an AWS IAM-authenticated Invoke.
 * No Cognito PKCE signing key is read, shared, copied or exported.
 * The executing portal Lambda role must be granted lambda:InvokeFunction
 * ONLY on the exact founder-session Lambda ARN.
 */
import { createHash, createHmac, randomBytes } from "node:crypto";

const region = "eu-north-1";
const service = "lambda";
const host = "lambda.eu-north-1.amazonaws.com";
const path = "/2015-03-31/functions/novapharm-intelligence-founder-session/invocations";
const url = "https://" + host + path;
const scope = "founder-shell-read-only";
const goodCookie = /^__Host-npi_founder=([A-Za-z0-9_-]{43}); Path=\/; HttpOnly; Secure; SameSite=Lax; Max-Age=([0-9]{1,4})$/u;
const hash = text => createHash("sha256").update(text, "utf8").digest("hex");
const mac = (key, value) => createHmac("sha256", key).update(value, "utf8").digest();
function signingKey(secret, date) {
  return mac(mac(mac(mac("AWS4" + secret, date), region), service), "aws4_request");
}
function credentials(env) {
  const accessKey = env?.AWS_ACCESS_KEY_ID;
  const secretKey = env?.AWS_SECRET_ACCESS_KEY;
  const sessionToken = env?.AWS_SESSION_TOKEN;
  if (typeof accessKey !== "string" || !/^A(?:SIA|KIA)[A-Z0-9]{16}$/u.test(accessKey) ||
      typeof secretKey !== "string" || secretKey.length < 32 ||
      typeof sessionToken !== "string" || sessionToken.length < 50) {
    throw new Error("Private founder IAM credentials unavailable.");
  }
  return { accessKey, secretKey, sessionToken };
}
/**
 * Pure signature routine so unsigned, stale, forged and wrong-target requests
 * can be rejected in unit tests and by AWS.
 */
export function signFounderLambdaInvoke({ body, credentials: auth, now = new Date() } = {}) {
  if (typeof body !== "string" || body.length > 16_000 ||
      !(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new Error("Founder invoke request invalid.");
  }
  const { accessKey, secretKey, sessionToken } = auth;
  const dateTime = now.toISOString().replace(/[-:]|\.\d{3}/gu, "");
  const date = dateTime.slice(0, 8);
  if (!/^\d{8}T\d{6}Z$/u.test(dateTime)) throw new Error("IAM timestamp invalid.");
  const payloadHash = hash(body);
  const signedNames = "content-type;host;x-amz-content-sha256;x-amz-date;x-amz-invocation-type;x-amz-security-token";
  const canonicalHeaders = [
    "content-type:application/json",
    "host:" + host,
    "x-amz-content-sha256:" + payloadHash,
    "x-amz-date:" + dateTime,
    "x-amz-invocation-type:RequestResponse",
    "x-amz-security-token:" + sessionToken,
  ].join("\n") + "\n";
  const canonical = ["POST", path, "", canonicalHeaders, signedNames, payloadHash].join("\n");
  const credentialScope = [date, region, service, "aws4_request"].join("/");
  const toSign = ["AWS4-HMAC-SHA256", dateTime, credentialScope, hash(canonical)].join("\n");
  const sig = createHmac("sha256", signingKey(secretKey, date)).update(toSign).digest("hex");
  return Object.freeze({
    url,
    headers: {
      "Content-Type": "application/json",
      "X-Amz-Content-Sha256": payloadHash,
      "X-Amz-Date": dateTime,
      "X-Amz-Security-Token": sessionToken,
      "X-Amz-Invocation-Type": "RequestResponse",
      Authorization: "AWS4-HMAC-SHA256 Credential=" + accessKey + "/" + credentialScope +
        ", SignedHeaders=" + signedNames + ", Signature=" + sig,
    },
  });
}

/**
 * The caller already verified the live Cognito RSA-signed token/nonce and
 * matching access token. The IAM-only Lambda independently rechecks MFA pool
 * settings, the exact founder account, current access token and freshness.
 */
export async function requestFounderPrivateIamSession({
  signedFounderIdentity, accessToken, transactionCreatedAtMs,
  enabled = process.env["NPI_FOUNDER_SESSION_API_ENABLED"] === "true",
  fetchImpl = globalThis.fetch, env = process.env, now = new Date(),
} = {}) {
  if (enabled !== true) return null;
  if (signedFounderIdentity?.founderProviderIdentityOnly !== true ||
      signedFounderIdentity.identityVerified !== false ||
      signedFounderIdentity.grantsTenantAccess !== false ||
      signedFounderIdentity.mfaVerifiedInSignedClaims !== false ||
      signedFounderIdentity.verifiedIssuer !==
        "https://cognito-idp.eu-north-1.amazonaws.com/eu-north-1_jBL6hCUE2" ||
      !/^[A-Za-z0-9-]{8,128}$/u.test(signedFounderIdentity.verifiedCognitoSubject ?? "") ||
      !Number.isSafeInteger(signedFounderIdentity.signedAuthTimeSeconds) ||
      !Number.isSafeInteger(signedFounderIdentity.signedIssuedAtSeconds) ||
      !Number.isSafeInteger(transactionCreatedAtMs) ||
      typeof accessToken !== "string" || accessToken.length < 100) return null;
  const event = {
    action: "mint_founder_shell_from_iam",
    subject: signedFounderIdentity.verifiedCognitoSubject,
    signedAuthTimeSeconds: signedFounderIdentity.signedAuthTimeSeconds,
    signedIssuedAtSeconds: signedFounderIdentity.signedIssuedAtSeconds,
    transactionCreatedAtMs,
    nonce: randomBytes(16).toString("base64url"),
    accessToken,
  };
  try {
    const body = JSON.stringify(event);
    const signed = signFounderLambdaInvoke({ body, now, credentials: credentials(env) });
    const response = await fetchImpl(signed.url, {
      method: "POST", headers: signed.headers, body,
      cache: "no-store", redirect: "error",
      signal: AbortSignal.timeout(7000),
    });
    if (response.status !== 200 || response.headers.get("x-amz-function-error")) return null;
    const payload = await response.json();
    if (payload?.statusCode !== 200) return null;
    const result = JSON.parse(payload.body ?? "{}");
    if (result.ok !== true || result.code !== "founder_session_active" ||
        result.role !== "founder" || result.scope !== scope ||
        result.customerAccess !== false || result.medicinesDataAccess !== false) return null;
    const cookie = payload.headers?.["Set-Cookie"];
    const match = typeof cookie === "string" ? goodCookie.exec(cookie) : null;
    if (!match) return null;
    const maxAge = Number(match[2]);
    if (!Number.isSafeInteger(maxAge) || maxAge < 1 || maxAge > 1800) return null;
    return Object.freeze({ token: match[1], maxAge, scope });
  } catch {
    return null;
  }
}
