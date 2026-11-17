import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGovSourcePlan,
  createGovSourceReader,
  normaliseGovSourceResult,
  sourcePlans
} from "../src/core/intelligence-global-source-gateway.mjs";

test("only three documented HTTPS hosts are reachable through fixed-path plans", () => {
  assert.equal(Object.keys(sourcePlans).length, 3);
  for (const sourceId of Object.keys(sourcePlans)) {
    const p = buildGovSourcePlan({ sourceId, term: "Apixaban", limit: 5 });
    assert.equal(new URL(p.url).protocol, "https:");
    assert.equal(new URL(p.url).origin, sourcePlans[sourceId].origin);
    assert.ok(new URL(p.url).pathname.startsWith(sourcePlans[sourceId].path));
  }
  assert.match(buildGovSourcePlan({ sourceId: "global-clinicaltrials", term: "Apixaban" }).url, /pageSize=5/);
  assert.match(buildGovSourcePlan({ sourceId: "es-aemps-cima", term: "Apixaban" }).url, /nombre=Apixaban/);
});
test("bounds reject query injection, unsupported hosts and unbounded pages", () => {
  for (const term of ['" OR true', "https://evil.example", "a", " ".repeat(100), "a\nb"]) {
    assert.throws(() => buildGovSourcePlan({ sourceId: "us-fda-drugsfda", term }));
  }
  assert.throws(() => buildGovSourcePlan({ sourceId: "evil", term: "Apixaban" }));
  assert.throws(() => buildGovSourcePlan({ sourceId: "us-fda-drugsfda", term: "Apixaban", limit: 500 }));
});
test("missing or expired rights deny BEFORE any outgoing request", async () => {
  let count = 0;
  const transport = async () => { count++; throw new Error("must never connect"); };
  const denied = createGovSourceReader({ authorize: async () => ({ decision: "denied" }), transport });
  await assert.rejects(denied.read({ sourceId: "global-clinicaltrials", term: "Apixaban", tenantId: "tenant1" }), /not approved/);
  const stale = createGovSourceReader({ authorize: async () => ({ decision: "approved", receiptId: "r-1", validUntil: "2025-01-01T00:00:00Z" }), transport });
  await assert.rejects(stale.read({ sourceId: "global-clinicaltrials", term: "Apixaban", tenantId: "tenant1" }), /not approved/);
  assert.equal(count, 0);
});
test("approved internal trial lookup returns provenance-only non-publishable records", async () => {
  let options;
  const transport = async (_url, config) => {
    options = config;
    return new Response(JSON.stringify({
      studies: [{ protocolSection: { identificationModule: { nctId: "NCT01234567", briefTitle: "Evidence study" } } }]
    }), { headers: { "content-type": "application/json" } });
  };
  const reader = createGovSourceReader({
    authorize: async () => ({ decision: "approved", receiptId: "internal-review", validUntil: "2032-01-01T00:00:00Z" }),
    transport
  });
  const result = await reader.read({ sourceId: "global-clinicaltrials", term: "Apixaban", tenantId: "tenant1" });
  assert.equal(result.canPublish, false);
  assert.equal(result.dataState, "unreconciled_upstream_preview");
  assert.equal(result.records[0].localId, "NCT01234567");
  assert.equal(options.redirect, "error");
  assert.equal(options.credentials, "omit");
});
test("upstream HTML, oversized JSON and unexpected schema fail closed", async () => {
  const auth = async () => ({ decision: "approved", receiptId: "review", validUntil: "2032-01-01T00:00:00Z" });
  for (const transport of [
    async () => new Response("<html></html>", { headers: { "content-type": "text/html" } }),
    async () => new Response(JSON.stringify({ studies: [] }), { headers: { "content-type": "application/json", "content-length": "500000" } }),
    async () => new Response(JSON.stringify({ wrong: [] }), { headers: { "content-type": "application/json" } })
  ]) {
    const reader = createGovSourceReader({ authorize: auth, transport });
    await assert.rejects(reader.read({ sourceId: "global-clinicaltrials", term: "Apixaban", tenantId: "tenant1" }));
  }
});
test("US and Spanish response normalizers keep local identifiers distinct", () => {
  const fda = normaliseGovSourceResult(buildGovSourcePlan({ sourceId: "us-fda-drugsfda", term: "Apixaban" }), {
    results: [{ application_number: "NDA12345", products: [{ brand_name: "EXAMPLE" }] }]
  });
  const cima = normaliseGovSourceResult(buildGovSourcePlan({ sourceId: "es-aemps-cima", term: "Apixaban" }), {
    resultados: [{ nregistro: "12345", nombre: "EJEMPLO" }]
  });
  assert.equal(fda.records[0].localId, "NDA12345");
  assert.equal(cima.records[0].localId, "12345");
  assert.notEqual(fda.jurisdiction, cima.jurisdiction);
  assert.equal(fda.canPublish, false);
  assert.equal(cima.canPublish, false);
});
