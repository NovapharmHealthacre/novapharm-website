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
});

test("authentication and writes require fresh CSRF tokens and keep credentials out of storage", () => {
  const gateway = source("lib/gateway.ts");
  const login = source("components/login-panel.tsx");
  assert.match(gateway, /security\/csrf/);
  assert.match(gateway, /X-CSRF-Token/);
  assert.doesNotMatch(`${gateway}\n${login}`, /localStorage|sessionStorage/);
});
