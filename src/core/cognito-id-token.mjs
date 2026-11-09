import { createPublicKey, verify } from "node:crypto";

export const COGNITO_STAGING_ISSUER = "https://cognito-idp.eu-north-1.amazonaws.com/eu-north-1_dZRAEzkYa";
export const COGNITO_STAGING_CLIENT_ID = "26al3v0so11731c1l1hglfa8d1";

export async function verifyCognitoWorkforceIdToken(token, {
  issuer = COGNITO_STAGING_ISSUER,
  clientId = COGNITO_STAGING_CLIENT_ID,
  nonce,
  fetchImplementation = fetch,
  now = Math.floor(Date.now() / 1000)
} = {}) {
  if (issuer !== COGNITO_STAGING_ISSUER || clientId !== COGNITO_STAGING_CLIENT_ID) throw new Error("Unapproved Cognito pool or app client.");
  if (typeof token !== "string" || token.length < 150 || token.length > 16000) throw new Error("Malformed identity token.");
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some(part => !/^[A-Za-z0-9_-]+$/.test(part))) throw new Error("Malformed JWT segments.");
  let header;
  let payload;
  try {
    header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    throw new Error("Unparseable identity token.");
  }
  if (header?.alg !== "RS256" || typeof header.kid !== "string" || !/^[A-Za-z0-9._-]{1,128}$/.test(header.kid)) throw new Error("Unapproved signature algorithm.");
  const response = await fetchImplementation(COGNITO_STAGING_ISSUER + "/.well-known/jwks.json", { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error("Cognito signing keys unavailable.");
  const body = await response.text();
  if (body.length > 50000) throw new Error("Oversized signing-key response.");
  let keySet;
  try { keySet = JSON.parse(body); } catch { throw new Error("Invalid Cognito signing keys."); }
  if (!Array.isArray(keySet.keys) || keySet.keys.length > 30) throw new Error("Unexpected signing-key set.");
  const matching = keySet.keys.filter(key => key && key.kid === header.kid && key.kty === "RSA" &&
    (!key.use || key.use === "sig") && (!key.alg || key.alg === "RS256"));
  if (matching.length !== 1) throw new Error("Untrusted or ambiguous Cognito signing key.");
  let valid = false;
  try {
    valid = verify("RSA-SHA256", Buffer.from(parts[0] + "." + parts[1]),
      createPublicKey({ key: matching[0], format: "jwk" }), Buffer.from(parts[2], "base64url"));
  } catch { valid = false; }
  if (!valid) throw new Error("Invalid Cognito signature.");
  if (payload.iss !== issuer || payload.aud !== clientId || payload.token_use !== "id") throw new Error("Issuer, audience, or token type mismatch.");
  if (typeof nonce === "string" && payload.nonce !== nonce) throw new Error("Identity nonce mismatch.");
  if (!Number.isSafeInteger(payload.iat) || payload.iat > now + 60 ||
      !Number.isSafeInteger(payload.exp) || payload.exp <= now ||
      (payload.auth_time !== undefined && (!Number.isSafeInteger(payload.auth_time) || payload.auth_time > now + 60))) {
    throw new Error("Identity token expired or has invalid timestamps.");
  }
  if (typeof payload.sub !== "string" || !/^[a-zA-Z0-9_-]{6,128}$/.test(payload.sub)) throw new Error("Invalid Cognito subject.");
  let identities = payload.identities;
  if (typeof identities === "string") {
    try { identities = JSON.parse(identities); } catch { identities = null; }
  }
  if (!Array.isArray(identities) || identities.length !== 1 ||
      identities[0]?.providerName !== "EntraP1" || identities[0]?.providerType !== "OIDC" ||
      !/^[a-zA-Z0-9-]{6,128}$/.test(String(identities[0]?.userId ?? ""))) {
    throw new Error("Unapproved federated identity provider.");
  }
  return Object.freeze({
    issuer,
    subject: payload.sub,
    provider: "entra-workforce-cognito",
    providerSubject: String(identities[0].userId),
    email: typeof payload.email === "string" ? payload.email.toLowerCase().slice(0, 160) : "",
    displayName: typeof payload.name === "string" ? payload.name.slice(0, 160) : ""
  });
}
