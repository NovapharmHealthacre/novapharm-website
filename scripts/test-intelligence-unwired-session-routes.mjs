import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const session = readFileSync(new URL("../apps/portal/app/customer/session/route.ts", import.meta.url), "utf8");
const logout = readFileSync(new URL("../apps/portal/app/customer/logout/route.ts", import.meta.url), "utf8");

test("unwired customer session GET and POST are explicit JSON 503", () => {
  assert.match(session, /export const GET = notLaunched/u);
  assert.match(session, /export const POST = notLaunched/u);
  assert.match(session, /status: 503/u);
  assert.match(session, /customer_access_not_launched/u);
  assert.match(session, /Cache-Control.*no-store/u);
  assert.doesNotMatch(session, /cookies\.set|Set-Cookie|stripeCustomerId|transactWrite|redirect\(/iu);
});
test("logout cannot claim a successful revocation without private API", () => {
  assert.match(logout, /export function POST\(\): Response/u);
  assert.match(logout, /status: 503/u);
  assert.match(logout, /customer_session_api_unavailable/u);
  assert.doesNotMatch(logout, /status: 200|cookies\.delete|Set-Cookie|redirect\(/iu);
});

test("security proxy must pass only the explicit fail-closed session routes", () => {
  const proxy = readFileSync(new URL("../apps/portal/proxy.ts", import.meta.url), "utf8");
  assert.match(proxy, /"\/customer\/session\/"/u);
  assert.match(proxy, /"\/customer\/logout\/"/u);
  assert.match(proxy, /anonymousPaths\.has\(pathname\)/u);
  assert.doesNotMatch(proxy, /pathname\.startsWith\("\/customer\/"\)/u);
  assert.match(proxy, /NextResponse\.redirect\(new URL\("\/", request\.url\)\)/u);
  assert.match(session, /status: 503/u);
  assert.match(logout, /status: 503/u);
});
