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
  assert.doesNotMatch(gateway, /x-ms-client-principal-id/);
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
