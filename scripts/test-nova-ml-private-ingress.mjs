import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { assessAnonymousResponse, novaMlIngressOrigin, novaMlPrivateRoutes, probeNovaMlAnonymousIngress } from "./nova-ml-private-ingress.mjs";

const quiet = { log() {}, error() {} };
const response = (status, headers = {}, body = "") => ({
  status,
  headers: { get: (name) => headers[name.toLowerCase()] ?? null },
  text: async () => body,
});

test("the private-only merge guard includes the Nova ML probe and its contract without publishing AWS contact", () => {
  const guard = readFileSync(new URL("../.github/workflows/dispatch-approved-aws-contact-release.yml", import.meta.url), "utf8");
  for (const path of [
    "scripts/nova-ml-private-ingress.mjs",
    "scripts/test-nova-ml-private-ingress.mjs",
    ".github/workflows/nova-ml-private-ingress-acceptance.yml",
  ]) assert.ok(guard.includes(path), path);
  // The owner production hold must precede BOTH the private-only and publisher gates.
  // Keep this test aligned with fail-closed deployment policy; do not remove the hold.
  assert.match(guard, /id: owner_hold/);
  assert.ok(guard.includes('.productionSignoff == "granted" and .productionPermissions.activatePublicCustomerAccess == true'));
  const guardedDispatch = "if: steps.owner_hold.outputs.hold == 'false' && steps.private_release.outputs.skip != 'true' && steps.publisher.outputs.skip != 'true'";
  assert.equal(guard.split(guardedDispatch).length - 1, 2, "both health verification and dispatch require explicit owner permission");
});

test("probe contains the exact four canonical Nova ML protected route slugs", () => {
  const src = readFileSync(new URL("../apps/portal/data/nova-ml-modules.ts", import.meta.url), "utf8");
  const slugs = [...src.matchAll(/slug: "(nova-[a-z-]+)"/g)].map((match) => match[1]);
  assert.equal(novaMlIngressOrigin, "https://intelligence.novapharmhealthcare.com");
  assert.deepEqual(novaMlPrivateRoutes, slugs.map((slug) => "/portal/executive-platform/nova-ml/" + slug + "/"));
  assert.equal(novaMlPrivateRoutes.length, 4);
  assert.equal(new Set(novaMlPrivateRoutes).size, 4);
});

test("deny anonymous 200, missing route, server error, external redirect and cacheable denial", () => {
  const base = { status: 302, location: "/", cacheControl: "private, no-store" };
  for (const status of [301, 302, 303, 307, 308]) assert.equal(assessAnonymousResponse({ ...base, status }).accepted, true);
  for (const status of [0, 200, 204, 404, 500]) assert.equal(assessAnonymousResponse({ ...base, status }).accepted, false);
  for (const location of ["https://untrusted.example/", "//untrusted.example/", "/dashboard/", "/auth/customer/start?redirect=unsafe"]) {
    assert.equal(assessAnonymousResponse({ ...base, location }).accepted, false);
  }
  assert.equal(assessAnonymousResponse({ ...base, cacheControl: "private" }).accepted, false);
  assert.equal(assessAnonymousResponse({ status: 401, cacheControl: "no-store" }).accepted, true);
  assert.equal(assessAnonymousResponse({ status: 403, cacheControl: "no-store" }).accepted, true);
  assert.equal(assessAnonymousResponse({ status: 403 }).accepted, false);
  assert.equal(assessAnonymousResponse({ status: 403, contentType: "application/json", body: '{"message":"Forbidden"}' }).accepted, true);
  assert.equal(assessAnonymousResponse({ status: 403, contentType: "text/html", body: '{"message":"Forbidden"}' }).accepted, false);
  assert.equal(assessAnonymousResponse({ status: 403, contentType: "application/json", body: '{"message":"Forbidden","extra":"leak"}' }).accepted, false);
});

test("probe performs only anonymous GET requests and does not follow redirects", async () => {
  const calls = [];
  const result = await probeNovaMlAnonymousIngress({
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return response(302, { location: "/portal/", "cache-control": "no-store" });
    },
    logger: quiet,
  });
  assert.equal(result.length, 4);
  assert.equal(calls.length, 4);
  for (const { url, options } of calls) {
    assert.equal(new URL(url).origin, novaMlIngressOrigin);
    assert.equal(options.method, "GET");
    assert.equal(options.redirect, "manual");
    assert.equal("authorization" in options.headers, false);
    assert.equal("cookie" in options.headers, false);
  }
  await assert.rejects(probeNovaMlAnonymousIngress({ origin: "https://untrusted.example/", logger: quiet }));
});

test("probe rejects public, missing and DNS-failing responses without reading private 200 bodies", async () => {
  let reads = 0;
  await assert.rejects(probeNovaMlAnonymousIngress({ logger: quiet, fetchImpl: async () => ({
    ...response(200),
    text: async () => { reads += 1; return "private body"; },
  }) }));
  assert.equal(reads, 0);
  await assert.rejects(probeNovaMlAnonymousIngress({ logger: quiet, fetchImpl: async () => response(404) }));
  await assert.rejects(probeNovaMlAnonymousIngress({ logger: quiet, fetchImpl: async () => { throw new Error("DNS"); } }));
});

test("post-probe reporting cannot be truncated by YAML comment parsing", () => {
  const workflow = readFileSync(new URL("../.github/workflows/nova-ml-private-ingress-acceptance.yml", import.meta.url), "utf8");
  const reporting = workflow.split("      - name: Record limits of anonymous verification")[1];
  assert.ok(reporting, "post-probe reporting step must exist");
  assert.match(reporting, /if: success\(\)/);
  assert.match(reporting, /run: \|/);
  assert.match(reporting, /printf '%s\\n'/);
  assert.match(reporting, /deployed SHA receipt/);
  assert.doesNotMatch(reporting, /run: echo/);
  assert.doesNotMatch(reporting, /#780/);
});
