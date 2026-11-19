import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Anonymous, read-only production check. Never certifies deployment or functional ML.
export const novaMlPrivateRoutes = Object.freeze([
  "/portal/executive-platform/nova-ml/nova-ml-studio/",
  "/portal/executive-platform/nova-ml/nova-core-runtime/",
  "/portal/executive-platform/nova-ml/nova-device-intelligence/",
  "/portal/executive-platform/nova-ml/nova-generative-assist/",
]);
export const novaMlIngressOrigin = "https://intelligence.novapharmhealthcare.com";
const allowedLoginLocations = new Set(["/", "/portal/", "/auth/customer/start"]);
const hasNoStore = (value) => /(?:^|,)\s*no-store\s*(?:,|$)/i.test(value);

export function assessAnonymousResponse({ status, location = "", cacheControl = "", contentType = "", body = "" }) {
  if (![301, 302, 303, 307, 308, 401, 403].includes(status)) {
    return { accepted: false, reason: "Unexpected HTTP " + status + "; no public 200, missing route or server error is acceptable" };
  }
  if ([301, 302, 303, 307, 308].includes(status)) {
    if (!allowedLoginLocations.has(location)) return { accepted: false, reason: "Redirect is not the approved local login entry" };
    if (!hasNoStore(cacheControl)) return { accepted: false, reason: "Private redirect lacks no-store" };
    return { accepted: true, reason: "Login redirect; not deployment proof" };
  }
  if (hasNoStore(cacheControl)) return { accepted: true, reason: "No-store denial; not deployment proof" };
  if (status === 403 && /^application\/json(?:\s*;|$)/i.test(contentType) && body === '{"message":"Forbidden"}') {
    return { accepted: true, reason: "Exact native AWS IAM denial; not deployment proof" };
  }
  return { accepted: false, reason: "Denial lacks no-store or the exact native IAM 403 body" };
}

export async function probeNovaMlAnonymousIngress({ fetchImpl = fetch, origin = novaMlIngressOrigin, logger = console } = {}) {
  if (origin !== novaMlIngressOrigin) throw new Error("Probe origin must be the dedicated Intelligence HTTPS domain");
  const results = await Promise.all(novaMlPrivateRoutes.map(async (route) => {
    try {
      const response = await fetchImpl(origin + route, {
        method: "GET", redirect: "manual", headers: { "cache-control": "no-cache" },
        signal: AbortSignal.timeout(15000),
      });
      const cacheControl = response.headers.get("cache-control") ?? "";
      // Do not read any HTTP 200 private body. Only inspect a bounded IAM 403.
      const body = response.status === 403 && !hasNoStore(cacheControl) ? await response.text() : "";
      return { route, status: response.status, ...assessAnonymousResponse({
        status: response.status,
        location: response.headers.get("location") ?? "",
        cacheControl, contentType: response.headers.get("content-type") ?? "", body,
      }) };
    } catch {
      return { route, status: null, accepted: false, reason: "HTTPS or DNS unavailable; production state is unverified" };
    }
  }));
  for (const result of results) {
    const message = (result.accepted ? "PASS " : "FAIL ") + result.route + " HTTP " + (result.status ?? "unavailable") + ": " + result.reason;
    if (result.accepted) logger.log(message);
    else logger.error(message);
  }
  if (results.some((result) => !result.accepted)) throw new Error("Nova ML anonymous ingress acceptance failed");
  logger.log("Four anonymous routes denied. This does NOT prove deployed code SHA, a signed native app, or authorised board access.");
  return results;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await probeNovaMlAnonymousIngress().catch((error) => {
    console.error(error instanceof Error ? error.message : "Nova ML ingress check failed");
    process.exitCode = 1;
  });
}
