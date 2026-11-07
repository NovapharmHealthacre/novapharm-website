import { createHash, createHmac, createPublicKey, randomBytes, timingSafeEqual, verify } from "node:crypto";

const ISSUER = "https://cognito-idp.eu-north-1.amazonaws.com/eu-north-1_dZRAEzkYa";
const fiveMinutes = 300000;

export function stagingCognitoSettings(env = process.env) {
  if (env.COGNITO_STAGING_VERIFICATION_ENABLED !== "true") throw new Error("Staging identity verification disabled.");
  const domain = new URL(env.COGNITO_DOMAIN || "https://invalid.invalid");
  const callback = new URL(env.COGNITO_CALLBACK_URL || "https://invalid.invalid/auth/callback/");
  const clientId = env.COGNITO_CLIENT_ID || "";
  const clientSecret = env.COGNITO_CLIENT_SECRET || "";
  const transactionKey = env.COGNITO_TRANSACTION_KEY || "";
  if (domain.protocol !== "https:" || domain.hostname !== "novapharm-staging-250675045172.auth.eu-north-1.amazoncognito.com" ||
    domain.pathname !== "/" || domain.search || domain.hash || domain.username || domain.password) throw new Error("Unapproved staging Cognito domain.");
  if (!/^[a-z0-9]{20,40}$/.test(clientId) || clientSecret.length < 20 || transactionKey.length < 32) throw new Error("Cognito server credentials not configured.");
  if (callback.pathname !== "/auth/callback/" || callback.search || callback.hash || callback.username || callback.password) throw new Error("The callback must be the application-owned callback route.");
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(callback.hostname);
  if (env.NODE_ENV === "production" ? callback.protocol !== "https:" || local : callback.protocol !== "https:" && !(callback.protocol === "http:" && local)) throw new Error("Unapproved callback transport.");
  if (env.PORTAL_ORIGIN && new URL(env.PORTAL_ORIGIN).origin !== callback.origin) throw new Error("Portal origin and callback differ.");
  return Object.freeze({ domain: domain.origin, callback: callback.toString(), clientId, clientSecret, transactionKey, issuer: ISSUER });
}

function mac(key, payload) {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

export function createStagingTransaction(config, now = Date.now()) {
  const state = randomBytes(32).toString("base64url");
  const nonce = randomBytes(32).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ state, nonce, verifier, createdAt: now })).toString("base64url");
  const url = new URL("/oauth2/authorize", config.domain);
  for (const [key, value] of Object.entries({
    response_type: "code", client_id: config.clientId, redirect_uri: config.callback,
    scope: "openid email profile", identity_provider: "EntraP1", state, nonce,
    code_challenge_method: "S256", code_challenge: createHash("sha256").update(verifier).digest("base64url")
  })) url.searchParams.set(key, value);
  return Object.freeze({ url: url.toString(), cookieValue: payload + "." + mac(config.transactionKey, payload), state, nonce, verifier });
}

export function readStagingTransaction(cookieValue, state, config, now = Date.now()) {
  if (typeof cookieValue !== "string" || cookieValue.length > 2048 || typeof state !== "string" || !/^[A-Za-z0-9_-]{32,100}$/.test(state)) return null;
  const bits = cookieValue.split(".");
  if (bits.length !== 2 || !/^[A-Za-z0-9_-]{43}$/.test(bits[1])) return null;
  const given = Buffer.from(bits[1], "base64url");
  const wanted = Buffer.from(mac(config.transactionKey, bits[0]), "base64url");
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) return null;
  try {
    const data = JSON.parse(Buffer.from(bits[0], "base64url").toString("utf8"));
    if (data.state !== state || !Number.isSafeInteger(data.createdAt) || data.createdAt > now || now - data.createdAt > fiveMinutes) return null;
    if (!/^[A-Za-z0-9_-]{32,100}$/.test(data.nonce) || !/^[A-Za-z0-9_-]{43,128}$/.test(data.verifier)) return null;
    return Object.freeze({ nonce: data.nonce, verifier: data.verifier });
  } catch {
    return null;
  }
}

async function boundedJson(response, max) {
  const data = await response.text();
  if (data.length > max) throw new Error("Identity response too large.");
  return JSON.parse(data);
}

export async function exchangeStagingCode(config, code, verifier, request = fetch) {
  if (typeof code !== "string" || !/^[A-Za-z0-9._~-]{8,2048}$/.test(code)) throw new Error("Invalid Cognito authorization code.");
  const body = new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: config.callback, code_verifier: verifier });
  const response = await request(config.domain + "/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + Buffer.from(config.clientId + ":" + config.clientSecret).toString("base64"),
      Accept: "application/json"
    },
    body: body.toString(), cache: "no-store", signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error("Cognito code exchange rejected.");
  const data = await boundedJson(response, 20000);
  if (String(data.token_type).toLowerCase() !== "bearer" || typeof data.id_token !== "string") throw new Error("Incomplete identity response.");
  return data.id_token;
}

export async function verifyStagingIdentity(config, token, nonce, request = fetch, now = Math.floor(Date.now() / 1000)) {
  if (typeof token !== "string" || token.length > 16000) throw new Error("Invalid identity token.");
  const seg = token.split(".");
  if (seg.length !== 3) throw new Error("Invalid JWT format.");
  let header;
  let claims;
  try {
    header = JSON.parse(Buffer.from(seg[0], "base64url").toString("utf8"));
    claims = JSON.parse(Buffer.from(seg[1], "base64url").toString("utf8"));
  } catch {
    throw new Error("Invalid JWT encoding.");
  }
  if (header.alg !== "RS256" || typeof header.kid !== "string" || !/^[A-Za-z0-9._-]{1,128}$/.test(header.kid)) throw new Error("Unapproved JWT signing algorithm.");
  const response = await request(config.issuer + "/.well-known/jwks.json", { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error("Cognito signing keys unavailable.");
  const keys = await boundedJson(response, 50000);
  const jwk = keys.keys?.find((key) => key.kid === header.kid && key.kty === "RSA" && (!key.use || key.use === "sig"));
  if (!jwk) throw new Error("Unknown Cognito signing key.");
  if (!verify("RSA-SHA256", Buffer.from(seg[0] + "." + seg[1]), createPublicKey({ key: jwk, format: "jwk" }), Buffer.from(seg[2], "base64url"))) throw new Error("Invalid Cognito signature.");
  if (claims.iss !== config.issuer || claims.aud !== config.clientId || claims.token_use !== "id" || claims.nonce !== nonce) throw new Error("Cognito issuer, audience, token use, or nonce mismatch.");
  if (!Number.isSafeInteger(claims.exp) || claims.exp <= now || !Number.isSafeInteger(claims.iat) || claims.iat > now + 60) throw new Error("Expired or invalid identity token.");
  if (typeof claims.sub !== "string" || !/^[A-Za-z0-9_-]{6,128}$/.test(claims.sub)) throw new Error("Cognito subject missing.");
  let identities = claims.identities;
  if (typeof identities === "string") {
    try { identities = JSON.parse(identities); } catch { identities = null; }
  }
  if (!Array.isArray(identities) || !identities.some((id) => id.providerName === "EntraP1" && id.providerType === "OIDC")) throw new Error("Not an approved Entra federated principal.");
  // This is identity verification only. Never create an application session or infer roles here.
  return Object.freeze({ verified: true, issuer: config.issuer, provider: "EntraP1" });
}
