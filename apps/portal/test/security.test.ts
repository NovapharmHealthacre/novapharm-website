import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const source = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");

test("portal remains noindex and redirects unauthenticated protected shells", () => {
  const proxy = source("proxy.ts");
  assert.match(proxy, /indexable: false/);
  assert.match(proxy, /np_session/);
  assert.match(proxy, /NextResponse\.redirect/);
  assert.match(proxy, /Cache-Control", "no-store/);
});

test("the browser gateway uses a fixed API origin and a route allowlist", () => {
  const gateway = source("app/gateway/[...path]/route.ts");
  assert.match(gateway, /permittedPaths/);
  assert.match(gateway, /new URL\(`\/api\/\$\{path\}`/);
  assert.doesNotMatch(gateway, /target\s*=\s*request\.nextUrl/);
  assert.match(gateway, /getSetCookie/);
  assert.match(gateway, /credentials|cookie/);
  assert.match(gateway, /PORTAL_VALIDATION_MODE/);
  assert.match(gateway, /127\.0\.0\.1/);
  assert.match(gateway, /production API origin must use HTTPS/);
  assert.match(gateway, /createPortalGatewaySignature/);
  assert.match(gateway, /PORTAL_GATEWAY_SECRET/);
  assert.match(gateway, /x-novapharm-gateway-signature/);
  assert.match(gateway, /enterprise\\\/medicines\\\/search/);
  assert.match(gateway, /enterprise\\\/medicines\\\/\(\?:analytics\|nearby\)/);
  assert.match(gateway, /medicine-\[a-f0-9\]/);
  assert.doesNotMatch(gateway, /x-ms-client-principal-id/);
});

test("Medicines Intelligence uses protected aggregate endpoints without exposing business-email values", () => {
  const intelligence = source("components/medicines-intelligence.tsx");
  assert.match(intelligence, /enterprise\/medicines\/analytics/);
  assert.match(intelligence, /enterprise\/medicines\/nearby/);
  assert.match(intelligence, /Validation samples can never contribute/);
  assert.doesNotMatch(intelligence, /public_business_email/);
  assert.doesNotMatch(intelligence, /fake chart|synthetic chart/iu);
});

test("authentication and writes require fresh CSRF tokens and keep credentials out of storage", () => {
  const gateway = source("lib/gateway.ts");
  const login = source("components/login-panel.tsx");
  const entra = source("components/entra-complete.tsx");
  const passwordChange = source("components/password-change.tsx");
  assert.match(gateway, /security\/csrf/);
  assert.match(gateway, /X-CSRF-Token/);
  assert.doesNotMatch(`${gateway}\n${login}`, /localStorage|sessionStorage/);
  assert.doesNotMatch(`${login}\n${entra}\n${passwordChange}`, /result\.redirectTo|returnTo/);
  assert.match(`${login}\n${entra}\n${passwordChange}`, /landingRouteForAccess/);
});

test("legacy portal clients use fixed application-owned destinations", () => {
  const clients = ["../../assets/js/portal-login.js", "../../assets/js/entra-complete.js", "../../assets/js/password-change.js", "../../assets/js/portal-app.js"]
    .map((file) => source(file))
    .join("\n");
  assert.doesNotMatch(clients, /\.redirectTo|logoutUrl/);
  assert.match(clients, /portalLandingRoute|post_logout_redirect_uri/);
});

test("US FDA discovery is a fixed read-only board-gateway flow with no browser-held API keys", () => {
  const gateway = source("app/gateway/[...path]/route.ts");
  const view = source("components/us-fda-label-discovery.tsx");
  const terminal = source("components/medicines-intelligence.tsx");
  assert.ok(gateway.includes("fda-labels$/"), "The gateway must permit the exact FDA label path");
  assert.match(gateway, /path === "v1\/intelligence\/regulatory\/us\/fda-labels"/);
  assert.match(gateway, /request\.method !== "GET"/);
  assert.match(view, /gatewayJson<FdaLabelResponse>/);
  assert.match(view, /source\.dataState|source\.records/);
  assert.match(view, /medical|regulatory/i);
  assert.match(terminal, /current === "regulatory-intelligence"/);
  assert.doesNotMatch(view, /OPENFDA_API_KEY|api_key|localStorage|sessionStorage/);
  assert.doesNotMatch(view, /fetch\("https:\/\/api\.fda\.gov/);
});


test("Intelligence release readiness is only available through exact read-only private gateway allowlist", () => {
  const gateway = source("app/gateway/[...path]/route.ts");
  const server = source("../../server.mjs");
  assert.ok(gateway.includes("intelligence\\/readiness$/"), "Only the exact readiness path can pass the BFF");
  assert.ok(gateway.includes('path === "v1/intelligence/readiness"'));
  assert.ok(gateway.includes('request.method !== "GET"'));
  assert.ok(gateway.includes('"Cache-Control": "no-store"'));
  assert.ok(server.includes('pathname === "/api/v1/intelligence/readiness"'));
  assert.ok(server.includes('scopedAuthentication(request, response, ["board"])'));
  assert.equal(gateway.includes("intelligence\\/.*"), false, "No catch-all intelligence route may be exposed");
});

test("ClinicalTrials.gov study lookup stays board-only, GET-only and source-attributed", () => {
  const gateway = source("app/gateway/[...path]/route.ts");
  const server = source("../../server.mjs");
  const view = source("components/clinical-trials-discovery.tsx");
  const terminal = source("components/medicines-intelligence.tsx");
  assert.ok(gateway.includes("clinical-trials$/"), "Only the exact ClinicalTrials route is allowed");
  assert.ok(gateway.includes('path === "v1/intelligence/evidence/us/clinical-trials"'), "Non-GET requests must be denied");
  assert.ok(server.includes('pathname === "/api/v1/intelligence/evidence/us/clinical-trials"'));
  assert.ok(server.includes('searchClinicalTrialsStudies(url.searchParams.get("intervention")'));
  assert.match(server, /scopedAuthentication\(request, response, \["board"\]\)/);
  assert.match(view, /gatewayJson<StudyResponse>/);
  assert.match(view, /result\.sourceId/);
  assert.match(terminal, /current === "evidence"/);
  assert.doesNotMatch(view, /localStorage|sessionStorage|OPENAI_API_KEY|NHS_DOHS_API_KEY/);
  assert.doesNotMatch(view, /fetch\("https:\/\/clinicaltrials\.gov\/api/);
});

test("the separate liveness route is noindex, never reveals readiness and cannot bypass private routes", () => {
  const health = source("app/healthz/route.ts");
  const proxy = source("proxy.ts");
  const docker = source("../../deployment/aws/Dockerfile.portal");
  assert.match(health, /export function GET/);
  assert.match(health, /status: 200/);
  assert.match(health, /Cache-Control": "no-store"/);
  assert.match(health, /X-Robots-Tag": "noindex, nofollow, noarchive"/);
  assert.doesNotMatch(health, /process\.env|jwt|cookies\(|database|session/iu);
  assert.match(proxy, /"\/healthz\/"/);
  assert.match(docker, /4303\/healthz\//);
});

test("unconfigured protected API origins fail closed with a controlled 503", () => {
  const gateway = source("app/gateway/[...path]/route.ts");
  const targetStart = gateway.indexOf("let target: URL;");
  const queryCopy = gateway.indexOf("target.search = request.nextUrl.search");
  assert.ok(targetStart > 0 && queryCopy > targetStart, "The service origin must be validated before proxying");
  const resolution = gateway.slice(targetStart, queryCopy);
  assert.match(resolution, /try\s*\{[\s\S]*?new URL\(`\/api\/\$\{path\}`, apiOrigin\(\)\)/);
  assert.match(resolution, /catch\s*\{[\s\S]*?status: 503/);
  assert.match(resolution, /"Retry-After": "30"/);
  assert.match(resolution, /"Cache-Control": "no-store"/);
  assert.doesNotMatch(resolution, /error: error\.|message: error\.|JSON\.stringify\(error\)/);
});

test("API Gateway public Cognito and health routes do not redirect into IAM-only fallback", () => {
  const config = source("next.config.ts");
  const proxy = source("proxy.ts");
  const health = source("app/healthz/route.ts");
  const start = source("app/auth/customer/start/route.ts");
  const callback = source("app/auth/callback/route.ts");
  assert.match(config, /trailingSlash:\s*true/);
  assert.match(config, /skipTrailingSlashRedirect:\s*true/);
  for (const route of ["/healthz/", "/auth/customer/start/", "/auth/callback/"]) {
    assert.ok(proxy.includes(JSON.stringify(route)), `Missing public path contract: ${route}`);
  }
  assert.match(health, /status:\s*200/);
  assert.match(start, /createCustomerLoginTransaction/);
  assert.match(callback, /verifyIntelligenceCustomerIdToken/);
  assert.match(callback, /grantsTenantAccess !== false/);
  assert.match(proxy, /np_session/);
  assert.match(proxy, /indexable:\s*false/);
  assert.match(proxy, /Cache-Control", "no-store/);
});
