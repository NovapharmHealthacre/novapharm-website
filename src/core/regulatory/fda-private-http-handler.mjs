/**
 * FDA read-only HTTP API v2 Lambda integration for a future explicitly approved
 * private route. Do NOT expose this handler through an unauthenticated route.
 *
 * Trusts claims ONLY when API Gateway supplied them after its JWT authorizer.
 * Local claims inspection is defense-in-depth; it does NOT verify a JWT signature.
 * Every missing release/config/auth/limiter dependency fails closed.
 */
import { searchOpenFdaLabels } from "./openfda-labels.mjs";
import { searchFdaEvidence } from "./openfda-evidence.mjs";

const kindSet = new Set(["labels", "approvals", "ndc", "adverse-events", "recalls"]);
const exactPath = "/v1/intelligence/regulatory/us/fda-research";
const allowedMethods = new Set(["GET"]);
const headers = Object.freeze({
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store, max-age=0",
  "x-content-type-options": "nosniff",
  "x-robots-tag": "noindex, nofollow, noarchive",
  "referrer-policy": "no-referrer",
});
function respond(statusCode, body, extraHeaders={}) {
  return {
    statusCode,
    headers: {...headers, ...extraHeaders},
    body: JSON.stringify(body),
    isBase64Encoded: false
  };
}
function audienceSet(value) {
  return new Set(String(value || "").split(",").map(x=>x.trim()).filter(Boolean));
}
function fail(code, message) {
  return respond(code, { error: message });
}
function validScope(claims, jwt, required) {
  const values = new Set([
    ...String(claims?.scope || "").split(/\s+/u),
    ...(Array.isArray(jwt?.scopes) ? jwt.scopes : [])
  ]);
  return values.has(required);
}
function groupsFromTrustedClaims(value) {
  // Cognito serializes 'cognito:groups' into a list; no substring matching.
  if (Array.isArray(value)) return new Set(value.filter(x=>typeof x === "string"));
  if (typeof value !== "string") return new Set();
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? new Set(parsed.filter(x=>typeof x === "string")) : new Set();
  } catch { return new Set(); }
}
function authorized(event, env, nowSeconds) {
  const jwt = event?.requestContext?.authorizer?.jwt;
  const claims = jwt?.claims;
  if (!claims || typeof claims !== "object" || Array.isArray(claims)) return false;
  if (claims.token_use !== "access") return false; // ID tokens are not API permissions.
  if (!claims.sub || typeof claims.sub !== "string") return false;
  if (claims.iss !== env.NPI_FDA_EXPECTED_ISSUER) return false;
  if (!audienceSet(env.NPI_FDA_APPROVED_CLIENT_IDS).has(claims.client_id)) return false;
  if (!Number.isSafeInteger(Number(claims.exp)) || Number(claims.exp) <= nowSeconds) return false;
  if (claims.nbf && Number(claims.nbf) > nowSeconds) return false;
  if (claims.iat && Number(claims.iat) > nowSeconds + 30) return false;
  if (!validScope(claims, jwt, env.NPI_FDA_REQUIRED_SCOPE)) return false;
  const permitted = audienceSet(env.NPI_FDA_APPROVED_BOARD_GROUPS);
  if (!permitted.size) return false;
  const assigned = groupsFromTrustedClaims(claims["cognito:groups"]);
  return [...assigned].some(group => permitted.has(group));
}
function configured(env) {
  return env.NPI_FDA_RELEASE_ENABLED === "true" &&
    env.NPI_FDA_SOURCE_RIGHTS_SIGNOFF === "true" &&
    env.NPI_FDA_INDEPENDENT_ACCEPTANCE === "true" &&
    typeof env.NPI_FDA_EXPECTED_ISSUER === "string" &&
    /^https:\/\/cognito-idp\.eu-north-1\.amazonaws\.com\/eu-north-1_[A-Za-z0-9]+$/u.test(env.NPI_FDA_EXPECTED_ISSUER) &&
    audienceSet(env.NPI_FDA_APPROVED_CLIENT_IDS).size > 0 &&
    audienceSet(env.NPI_FDA_APPROVED_BOARD_GROUPS).size > 0 &&
    /^novapharm\/[A-Za-z0-9._-]+$/u.test(env.NPI_FDA_REQUIRED_SCOPE || "");
}
function queryParams(event) {
  // HTTP API payload v2 collapses repeated raw query parameters into the
  // queryStringParameters object. Compare both representations and reject
  // parameter pollution before calling the FDA or charging a board quota.
  const raw = event?.rawQueryString;
  if (typeof raw !== "string" || !raw || raw.length > 500 || raw.split("&").length !== 2) return null;
  const parsed = new URLSearchParams(raw);
  const keys = [...parsed.keys()];
  if (keys.length !== 2 || keys.filter(k=>k==="kind").length !== 1 ||
      keys.filter(k=>k==="drug").length !== 1) return null;
  const values = event?.queryStringParameters;
  if (!values || typeof values !== "object" || Array.isArray(values) ||
      Object.keys(values).length !== 2) return null;
  const kind = values.kind;
  const drug = values.drug;
  if (typeof kind !== "string" || !kindSet.has(kind) || parsed.get("kind") !== kind) return null;
  if (typeof drug !== "string" || drug.length > 80 ||
      parsed.get("drug") !== drug || !/^[A-Za-z][A-Za-z0-9 -]{1,63}$/u.test(drug)) return null;
  return { kind, drug };
}
/**
 * Usage after approved wiring:
 *   export const handler = createPrivateFdaHandler({
 *      limit: async ({sub, route}) => distributedLimiterThatFailsClosed(...)
 *   });
 */
export function createPrivateFdaHandler({ limit, searchLabels=searchOpenFdaLabels,
    searchEvidence=searchFdaEvidence, env=process.env, clock=()=>Date.now() }={}) {
  return async function handle(event) {
    const method = event?.requestContext?.http?.method;
    const path = event?.rawPath;
    if (path !== exactPath) return fail(404, "Research route not available.");
    if (!allowedMethods.has(method)) return respond(405, {error:"Read-only research."},{allow:"GET"});
    if (!configured(env)) return fail(503, "Protected FDA research has not been independently released.");
    if (!authorized(event,env,Math.floor(clock()/1000))) return fail(403,"Research access denied.");
    if (typeof limit !== "function") return fail(503, "Research quota service not configured.");
    const q = queryParams(event);
    if (!q) return fail(400, "Invalid FDA research query.");
    // This must be an atomic distributed per-identity limiter before approval.
    let allowed = false;
    try { allowed = (await limit({ sub:event.requestContext.authorizer.jwt.claims.sub, path, kind:q.kind })) === true; }
    catch { return fail(503, "Research quota service unavailable."); }
    if (!allowed) return respond(429,{error:"FDA research limit reached."},{"retry-after":"60"});
    try {
      const context={accessScopes:["board"]};
      const result = q.kind==="labels"
        ? await searchLabels(q.drug,context)
        : await searchEvidence(q.kind,q.drug,context);
      // Never forward error objects, patient-level events, cookies, or source
      // transport headers from an upstream API.
      if (!result || typeof result !== "object" || Array.isArray(result) ||
          !Array.isArray(result.records) || result.records.length>5 ||
          typeof result.sourceId!=="string" ||
          !["no_source_matches","public_source_observations"].includes(result.dataState))
        throw Error("Invalid source");
      if (q.kind==="adverse-events" && result.records.length!==0) throw Error("FAERS must be count-only");
      // Response payloads remain bounded even if an upstream adapter regresses.
      const serialized=JSON.stringify(result);
      if (Buffer.byteLength(serialized,"utf8")>256*1024) throw Error("Oversized FDA response");
      return respond(200,result);
    } catch(error) {
      const status = error?.statusCode===400 ? 400 : 503;
      return fail(status,status===400 ? "Invalid FDA research query." : "FDA research source temporarily unavailable.");
    }
  };
}
// No default exported handler: infrastructure must supply a real distributed
// limiter and release configuration before deployment.
