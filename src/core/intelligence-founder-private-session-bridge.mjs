/**
 * One-purpose private Cognito callback -> founder-session bridge.
 * This is never exposed to the browser and never accepts tenant/role claims.
 */
import { createHash, createHmac, randomBytes } from "node:crypto";

export const FOUNDER_SESSION_ORIGIN = "https://intelligence.novapharmhealthcare.com";
const DOMAIN = "novapharm-founder-session-bridge-v1";

export function deriveFounderBridgeKey(signingKey) {
  if (typeof signingKey !== "string" || signingKey.length < 32)
    throw new Error("Founder bridge signer is unavailable.");
  return createHmac("sha256", signingKey).update(DOMAIN).digest("hex");
}

export function founderSessionBridgeHeaders({
  idToken, accessToken, signingKey, nowSeconds = Math.floor(Date.now() / 1000),
  nonce = randomBytes(16).toString("base64url"),
} = {}) {
  if (typeof idToken !== "string" || idToken.length < 100 ||
      typeof accessToken !== "string" || accessToken.length < 100 ||
      !Number.isSafeInteger(nowSeconds) || nowSeconds < 1 ||
      !/^[A-Za-z0-9_-]{22,64}$/u.test(nonce)) {
    throw new Error("Invalid founder bridge inputs.");
  }
  const bridgeKey = deriveFounderBridgeKey(signingKey);
  const digest = text => createHash("sha256").update(text, "ascii").digest("hex");
  const time = String(nowSeconds);
  const proof = createHmac("sha256", bridgeKey)
    .update([time, nonce, digest(idToken), digest(accessToken)].join("."))
    .digest("hex");
  return Object.freeze({
    "X-Npi-Founder-Time": time,
    "X-Npi-Founder-Nonce": nonce,
    "X-Npi-Founder-Proof": proof,
  });
}

/** Returns an opaque cookie only after an independently authorized AWS API. */
export async function requestFounderPrivateSession({
  idToken, accessToken,
  signingKey,
  enabled = process.env["NPI_FOUNDER_SESSION_API_ENABLED"] === "true",
  fetchImpl = globalThis.fetch,
  nowSeconds,
} = {}) {
  if (enabled !== true) return null;
  const proof = founderSessionBridgeHeaders({
    idToken, accessToken, signingKey, nowSeconds,
  });
  try {
    const response = await fetchImpl(FOUNDER_SESSION_ORIGIN + "/founder/session", {
      method: "POST", cache: "no-store", redirect: "error",
      headers: {
        Authorization: "Bearer " + idToken,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...proof,
      },
      body: JSON.stringify({ accessToken }),
      signal: AbortSignal.timeout(7000),
    });
    if (response.status !== 200) return null;
    const payload = await response.json();
    if (payload?.ok !== true || payload.code !== "founder_session_active" ||
        payload.role !== "founder" ||
        payload.scope !== "founder-shell-read-only" ||
        payload.customerAccess !== false || payload.medicinesDataAccess !== false) return null;
    const cookie = response.headers.get("set-cookie") ?? "";
    const match = /^__Host-npi_founder=([A-Za-z0-9_-]{43}); Path=\/; HttpOnly; Secure; SameSite=Lax; Max-Age=([0-9]{1,4})$/u.exec(cookie);
    if (!match) return null;
    const maxAge = Number(match[2]);
    if (!Number.isSafeInteger(maxAge) || maxAge < 1 || maxAge > 1800) return null;
    return Object.freeze({ token: match[1], maxAge, scope: "founder-shell-read-only" });
  } catch {
    return null;
  }
}
