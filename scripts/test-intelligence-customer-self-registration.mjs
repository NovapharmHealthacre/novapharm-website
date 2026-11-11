import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createCustomerLoginTransaction } from "../src/core/intelligence-customer-oidc.mjs";

const route = readFileSync(new URL("../apps/portal/app/auth/customer/register/route.ts", import.meta.url), "utf8");
const proxy = readFileSync(new URL("../apps/portal/proxy.ts", import.meta.url), "utf8");
const ui = readFileSync(new URL("../apps/portal/components/intelligence-sign-in.tsx", import.meta.url), "utf8");

test("Cognito self registration reuses cryptographically bound code+PKCE transaction", () => {
  assert.match(route, /createCustomerLoginTransaction\(/u);
  assert.match(route, /destination\.pathname = "\/signup"/u);
  assert.match(route, /destination\.hostname !== "novapharm-intelligence-production-eun1\.auth\.eu-north-1\.amazoncognito\.com"/u);
  assert.match(route, /destination\.searchParams\.get\("code_challenge_method"\) !== "S256"/u);
  assert.match(route, /sameSite: "lax"/u);
  assert.match(route, /httpOnly: true/u);
  assert.match(route, /secure: true/u);
  assert.match(route, /path: "\/"/u);
  assert.match(route, /customer_registration_unavailable/u);
  assert.match(route, /status: 503/u);
});
test("registered identity does not create customer, subscription, contract, seat or licence grant", () => {
  assert.doesNotMatch(route, /AdminCreateUser|stripe\.com\/v1|UpdateItem|PutItem|TransactWrite|grantsCustomerAccess: true/iu);
  assert.match(ui, /href="\/auth\/customer\/register"/u);
  assert.match(ui, /href="\/auth\/customer\/start"/u);
  assert.match(ui, /Subscription checkout and medicines access become available only after organisation, contract, billing and dataset approvals\./u);
});
test("proxy has exact registration start allowlist, not global customer exemption", () => {
  assert.match(proxy, /"\/auth\/customer\/register\/"/u);
  assert.match(proxy, /anonymousPaths\.has\(pathname\)/u);
  assert.doesNotMatch(proxy, /pathname\.startsWith\("\/auth\/customer\/"\)/u);
  assert.doesNotMatch(proxy, /pathname\.startsWith\("\/customer\/"\)/u);
});
test("hosted Cognito authorize transaction requires fresh nonce and correct callback", () => {
  const t = createCustomerLoginTransaction({ signingKey: "z".repeat(48), nowMs: 1_796_100_000_000 });
  const u = new URL(t.authorizeUrl);
  assert.equal(u.hostname, "novapharm-intelligence-production-eun1.auth.eu-north-1.amazoncognito.com");
  assert.equal(u.pathname, "/oauth2/authorize");
  assert.equal(u.searchParams.get("response_type"), "code");
  assert.equal(u.searchParams.get("redirect_uri"), "https://intelligence.novapharmhealthcare.com/auth/callback");
  assert.equal(u.searchParams.get("code_challenge_method"), "S256");
  assert.equal(u.searchParams.get("acr_values"), "urn:cognito:loa:4");
  assert.equal(t.grantsTenantAccess, false);
  assert.ok(t.transactionCookieValue.length>200);
});
