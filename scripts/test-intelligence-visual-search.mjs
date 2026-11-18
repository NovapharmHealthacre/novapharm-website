import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { searchApprovedVisualCatalogue, visualSearchReadiness } from "../src/core/intelligence-visual-search.mjs";

const configured = {
  NPI_CLIP_ENABLED: "true",
  NPI_CLIP_SERVICE_TOKEN: "a".repeat(48),
  NPI_CLIP_SERVICE_ORIGIN: "http://127.0.0.1:8767"
};

test("private CLIP retrieval is always disabled by default", async () => {
  assert.equal(visualSearchReadiness({}).enabled, false);
  await assert.rejects(searchApprovedVisualCatalogue({ query: "approved box" }, {}), /not enabled/);
});

test("unsafe upstream origins and missing tokens never get network access", async () => {
  let called = false;
  for (const env of [
    { ...configured, NPI_CLIP_SERVICE_ORIGIN: "https://example.com" },
    { ...configured, NPI_CLIP_SERVICE_ORIGIN: "http://169.254.169.254" },
    { ...configured, NPI_CLIP_SERVICE_ORIGIN: "http://127.0.0.1:8767/evil" },
    { ...configured, NPI_CLIP_SERVICE_TOKEN: "short" }
  ]) {
    await assert.rejects(searchApprovedVisualCatalogue({ query: "approved carton" }, env, async () => { called = true; }));
  }
  assert.equal(called, false);
});

test("query bounds and returned source validation are enforced", async () => {
  const fetchImpl = async (_url, init) => {
    assert.equal(init.method, "POST");
    assert.equal(init.headers.Authorization, `Bearer ${configured.NPI_CLIP_SERVICE_TOKEN}`);
    return { ok: true, json: async () => ({
      contract: "novapharm.intelligence.visual-search.v1",
      results: [{ assetId: "pack-01", title: "Approved public carton", rightsReference: "rights:1", sourceUrl: "https://novapharmhealthcare.com/products/" }]
    }) };
  };
  const output = await searchApprovedVisualCatalogue({ query: "approved carton", limit: 3 }, configured, fetchImpl);
  assert.equal(output.results[0].status, "unverified_visual_match");
  assert.equal(output.humanReviewRequired, true);
  assert.equal(output.regulatoryStatusVerified, false);
  assert.equal("confidence" in output.results[0], false);
  await assert.rejects(searchApprovedVisualCatalogue({ query: "x" }, configured, fetchImpl), /3 to 240/);
  await assert.rejects(searchApprovedVisualCatalogue({ query: "approved", limit: 99 }, configured, fetchImpl), /Limit/);
  await assert.rejects(searchApprovedVisualCatalogue({ query: "approved" }, configured, async () => ({ ok: true, json: async () => ({
    contract: "novapharm.intelligence.visual-search.v1",
    results: [{ assetId: "p", title: "Unsafe", rightsReference: "r", sourceUrl: "http://localhost/image" }]
  }) })), /not enabled|unavailable/);
});

test("web and API routes stay board-scoped and exact-allowlisted", () => {
  const server = readFileSync(new URL("../server.mjs", import.meta.url), "utf8");
  const portal = readFileSync(new URL("../apps/portal/app/gateway/[...path]/route.ts", import.meta.url), "utf8");
  assert.ok(server.includes('pathname === "/api/v1/intelligence/visual/search"'));
  assert.ok(server.includes("searchApprovedVisualCatalogue("));
  assert.ok(server.includes('scopedAuthentication(request, response, ["board"])'));
  assert.ok(portal.includes("v1\\/intelligence\\/visual\\/(?:readiness|search)"));
  assert.ok(portal.includes('path === "v1/intelligence/visual/search"'));
  assert.ok(!portal.includes("v1\\/intelligence\\/visual\\/.*"));
  assert.ok(server.includes("requireCsrf(request)"));
});
