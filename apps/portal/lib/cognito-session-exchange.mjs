import { randomUUID } from "node:crypto";
import { createPortalGatewaySignature, validPortalGatewaySecret } from "../../../src/core/portal-gateway-signature.mjs";

const permitted = new Set(["employee", "board", "admin"]);

export async function exchangeApprovedCognitoSession({ token, identityNonce, accessType, environment = process.env, request = fetch }) {
  if (environment.COGNITO_PORTAL_SESSION_ENABLED !== "true" || !permitted.has(accessType)) throw new Error("Portal session activation is disabled.");
  if (typeof token !== "string" || token.length > 16000 || !/^[A-Za-z0-9_-]{32,100}$/.test(identityNonce)) throw new Error("Invalid Cognito exchange.");
  const secret = environment.PORTAL_GATEWAY_SECRET || "";
  if (!validPortalGatewaySecret(secret)) throw new Error("Private portal signing key is not configured.");
  const origin = new URL(environment.INTERNAL_API_ORIGIN || "https://invalid.invalid");
  const loopback = ["localhost", "127.0.0.1"].includes(origin.hostname);
  if (origin.username || origin.password || origin.search || origin.hash || origin.pathname !== "/" ||
    (environment.NODE_ENV === "production" && (origin.protocol !== "https:" || loopback)) ||
    (origin.protocol !== "https:" && !(loopback && origin.protocol === "http:" && environment.PORTAL_VALIDATION_MODE === "true"))) {
    throw new Error("Unapproved private API origin.");
  }
  const portalOrigin = new URL(environment.PORTAL_ORIGIN || "https://invalid.invalid");
  if (portalOrigin.protocol !== "https:" && !(environment.PORTAL_VALIDATION_MODE === "true" && portalOrigin.hostname === "localhost")) {
    throw new Error("Unapproved portal origin.");
  }
  const timestamp = String(Date.now());
  const nonce = randomUUID();
  const signature = createPortalGatewaySignature({
    secret, timestamp, nonce, method: "POST", pathname: "/api/auth/cognito",
    accessType, principal: token + ":" + identityNonce
  });
  const response = await request(origin.origin + "/api/auth/cognito", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Origin: portalOrigin.origin,
      "x-novapharm-gateway-timestamp": timestamp,
      "x-novapharm-gateway-nonce": nonce,
      "x-novapharm-gateway-access": accessType,
      "x-novapharm-gateway-signature": signature,
      "x-novapharm-cognito-token": token,
      "x-novapharm-cognito-identity-nonce": identityNonce
    },
    body: JSON.stringify({ accessType }),
    redirect: "manual",
    cache: "no-store",
    signal: AbortSignal.timeout(8000)
  });
  if (response.status !== 200) throw new Error("Backend did not authorise the requested portal role.");
  const responseBody = await response.text();
  if (responseBody.length > 2048) throw new Error("Invalid backend exchange response.");
  let data;
  try { data = JSON.parse(responseBody); } catch { throw new Error("Malformed backend exchange response."); }
  if (data.ok !== true || data.accessType !== accessType) throw new Error("Backend role confirmation mismatch.");
  const cookies = response.headers.getSetCookie?.() || [response.headers.get("set-cookie")].filter(Boolean);
  if (cookies.length !== 1) throw new Error("Backend did not issue one session cookie.");
  const cookieMatch = /^np_session=([0-9a-f]{64}%2E[0-9a-f]{64}|[0-9a-f]{64}\.[0-9a-f]{64})(?:;|$)/i.exec(cookies[0]);
  if (!cookieMatch || !/;\s*HttpOnly(?:;|$)/i.test(cookies[0])) throw new Error("Backend session cookie invalid.");
  const session = decodeURIComponent(cookieMatch[1]);
  return Object.freeze({ session, accessType });
}
