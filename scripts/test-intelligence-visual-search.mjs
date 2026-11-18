import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { probeVisualSearchReadiness, searchApprovedVisualCatalogue, visualSearchReadiness } from "../src/core/intelligence-visual-search.mjs";

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
    return { ok: true, text: async () => JSON.stringify({
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
  await assert.rejects(searchApprovedVisualCatalogue({ query: "approved" }, configured, async () => ({ ok: true, text: async () => JSON.stringify({
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

test("unsupported client payloads fail before any model invocation", async () => {
  let called = false;
  const remote = async () => {
    called = true;
    return { ok: false };
  };
  const invalid = [
    null,
    [],
    "query",
    { query: "public carton", accessType: "admin" },
    { query: { text: "public carton" } },
    { query: "public carton", limit: 0 },
    { query: "public carton", limit: 1.5 },
    { query: "public carton", limit: "5" },
    { query: "public carton\u0000hidden" }
  ];
  for (const input of invalid) {
    await assert.rejects(searchApprovedVisualCatalogue(input, configured, remote), { statusCode: 400 });
  }
  assert.equal(called, false, "invalid requests must never reach the private model service");
});

test("upstream cannot inject duplicate images, credentialed URLs, fragments or fake model confidence", async () => {
  const good = { assetId: "pack-01", title: "Approved carton", rightsReference: "rights:1", sourceUrl: "https://novapharmhealthcare.com/products/" };
  for (const items of [
    [good, good],
    [{ ...good, sourceUrl: "https://attacker@novapharmhealthcare.com/products/" }],
    [{ ...good, sourceUrl: "https://novapharmhealthcare.com/products/#hidden" }],
    [{ ...good, sourceUrl: "https://127.0.0.1/admin" }],
    [{ ...good, sourceUrl: "https://[::1]/admin" }],
    [{ ...good, sourceUrl: "https://warehouse.internal/records" }],
    [{ ...good, assetId: "../secrets" }],
    [{ ...good, rightsReference: "" }]
  ]) {
    await assert.rejects(searchApprovedVisualCatalogue({ query: "public carton", limit: 5 }, configured, async () => ({
      ok: true,
      text: async () => JSON.stringify({ contract: "novapharm.intelligence.visual-search.v1", results: items })
    })), { statusCode: 503 });
  }
});

test("shared versioned CLIP contract is inherited across web, iOS, Android and governed registries", () => {
  const read = name => readFileSync(new URL("../" + name, import.meta.url), "utf8");
  const spec = JSON.parse(read("docs/intelligence/visual-search-cross-platform-contract.json"));
  const sources = [
    "src/core/intelligence-visual-search.mjs",
    "apps/portal/components/clip-visual-search.tsx",
    "native/novapharm-intelligence-apple/NovaClipVisualSearch.swift",
    "native/novapharm-intelligence-android/src/main/kotlin/com/novapharm/intelligence/NovaClipVisualSearch.kt"
  ];
  assert.equal(spec.contract, "novapharm.intelligence.visual-search.v1");
  assert.equal(spec.releaseState, "source_candidate_disabled");
  assert.equal(spec.result.productIdentityVerified, false);
  assert.equal(spec.result.regulatoryStatusVerified, false);
  assert.equal(spec.infrastructure.enabledByDefault, false);
  for (const name of sources) {
    assert.ok(read(name).includes(spec.contract), name + " must use exactly the governed response contract");
    assert.ok(read(name).includes(spec.result.status), name + " must label unverified matches");
  }
  const modelRegistry = JSON.parse(read("docs/ai-model-register.json"));
  const useCases = JSON.parse(read("docs/ai-use-case-register.json"));
  assert.ok(modelRegistry.models.some(m => m.id === "openai-clip-private-research-candidate"));
  assert.ok(useCases.implementedFoundations.some(m => m.id === "clip-approved-public-visual-retrieval" && m.maturity === "source-only-gated-not-live"));
  const catalogue = read("apps/portal/data/nova-ml-modules.ts");
  assert.ok(catalogue.includes("English text-to-approved-public-image CLIP research"));
  assert.ok(read("services/clip/rights.py").includes("rightsExpiryDate"));
  assert.ok(read("services/clip/serve.py").includes("valid_expiry"));
  assert.ok(read("services/clip/build_index.py").includes("validate_public_asset"));
});

test("private model response must be below 32 KB and valid JSON", async () => {
  await assert.rejects(searchApprovedVisualCatalogue({ query: "approved artwork" }, configured, async () => ({
    ok: true, headers: { get: () => "40000" }, text: async () => {
      throw new Error("Large responses must be rejected before body read");
    }
  })), { statusCode: 503 });
  await assert.rejects(searchApprovedVisualCatalogue({ query: "approved artwork" }, configured, async () => ({
    ok: true, headers: { get: () => null }, text: async () => "x".repeat(40_000)
  })), { statusCode: 503 });
  await assert.rejects(searchApprovedVisualCatalogue({ query: "approved artwork" }, configured, async () => ({
    ok: true, text: async () => "not json"
  })), { statusCode: 503 });
});

test("streamed private inference rejects oversized content before consuming all chunks", async () => {
  let consumed = 0;
  const response = {
    ok: true,
    headers: { get: () => null },
    body: new ReadableStream({
      pull(controller) {
        consumed += 1;
        controller.enqueue(new Uint8Array(16_384));
        if (consumed >= 20) controller.close();
      }
    }),
    text: async () => { throw new Error("Stream-capable responses must never be read unbounded"); }
  };
  await assert.rejects(
    searchApprovedVisualCatalogue({ query: "approved public artwork" }, configured, async () => response),
    { statusCode: 503 }
  );
  assert.ok(consumed <= 4, "More chunks were consumed after exceeding the 32KB limit.");
});

test("CLIP readiness requires real private model health, never the env flag alone", async () => {
  let calls = 0;
  const fake = async (url, init) => {
    calls += 1;
    assert.equal(String(url), "http://127.0.0.1:8767/healthz");
    assert.equal(init.headers.Authorization, `Bearer ${configured.NPI_CLIP_SERVICE_TOKEN}`);
    return { ok: true, json: async () => ({ status: "ready" }) };
  };
  assert.equal((await probeVisualSearchReadiness({}, fake)).state, "disabled");
  assert.equal(calls, 0);
  const healthy = await probeVisualSearchReadiness(configured, fake);
  assert.equal(healthy.enabled, true);
  assert.equal(healthy.state, "private_runtime_ready");
  assert.equal(calls, 1);
  for (const backend of [
    async () => ({ ok: false }),
    async () => ({ ok: true, json: async () => ({ status: "initialising" }) }),
    async () => { throw new Error("service offline"); }
  ]) {
    const state = await probeVisualSearchReadiness(configured, backend);
    assert.equal(state.enabled, false);
    assert.equal(state.state, "unavailable");
  }
});
