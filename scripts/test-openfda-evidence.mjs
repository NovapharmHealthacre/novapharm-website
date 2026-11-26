import assert from "node:assert/strict";
import { test } from "node:test";
import { FDA_EVIDENCE_KINDS, searchFdaEvidence } from "../src/core/regulatory/openfda-evidence.mjs";

const board = { accessScopes: ["board"] };
const recordByKind = {
  approvals: { application_number: "NDA123456", sponsor_name: "Example", products: [{ brand_name: "ExampleRx", product_number: "001" }], submissions: [{ submission_status: "AP" }] },
  ndc: { product_ndc: "12345-678", generic_name: "APIXABAN", packaging: [{ package_ndc: "12345-678-90" }] },
  "adverse-events": { safetyreportid: "private", patient: { patientonsetage: "99", reaction: [{ reactionmeddrapt: "private" }] } },
  recalls: { recall_number: "D-0001-2026", classification: "Class II", reason_for_recall: "Example quality recall" }
};
function fixture(kind, total = 9) {
  return new Response(JSON.stringify({ meta: { results: { total } }, results: [recordByKind[kind]] }), {
    status: 200, headers: { "content-type": "application/json" }
  });
}
test("the FDA evidence catalogue is exactly four additional controlled kinds", () => {
  assert.deepEqual(FDA_EVIDENCE_KINDS, ["approvals", "ndc", "adverse-events", "recalls"]);
});
test("customer, unauthenticated and unsupported kind requests never fetch", async () => {
  for (const kind of FDA_EVIDENCE_KINDS) {
    for (const accessScopes of [[], ["customer"], ["employee"]]) {
      let calls = 0;
      await assert.rejects(searchFdaEvidence(kind, "apixaban", { accessScopes }, {
        fetchImpl: () => { calls++; throw new Error("Network must not happen"); }
      }), { statusCode: 403 });
      assert.equal(calls, 0);
    }
  }
  await assert.rejects(searchFdaEvidence("other", "apixaban", board), { statusCode: 400 });
});
test("input validation rejects injection and private information before outbound HTTP", async () => {
  for (const value of ["", "a", "apixaban:OR:*", "x\nsecret", "é", "a".repeat(65)]) {
    let calls = 0;
    await assert.rejects(searchFdaEvidence("ndc", value, board, {
      fetchImpl: () => { calls++; throw Error("Unexpected"); }
    }), { statusCode: 400 });
    assert.equal(calls, 0);
  }
});
for (const kind of FDA_EVIDENCE_KINDS) {
  test(kind + " enforces fixed FDA source, bounded result, provenance and no raw data", async () => {
    let called = 0;
    const result = await searchFdaEvidence(kind, "apixaban", board, {
      fetchImpl: (url, request) => {
        called++;
        const u = new URL(url);
        assert.equal(u.origin, "https://api.fda.gov");
        assert.equal(u.pathname, "/drug/" + ({ approvals: "drugsfda", ndc: "ndc", "adverse-events": "event", recalls: "enforcement" }[kind]) + ".json");
        assert.equal(u.searchParams.get("limit"), kind === "adverse-events" ? "1" : "3");
        assert.equal(request.method, "GET");
        assert.equal(request.redirect, "error");
        return fixture(kind);
      }
    });
    assert.equal(called, 1);
    assert.equal(result.jurisdiction, "US");
    assert.equal(result.matchedCountReported, 9);
    assert.equal(result.sourceId, "us.fda.openfda." + kind);
    assert.equal(result.records.length, kind === "adverse-events" ? 0 : 1);
    assert.ok(!JSON.stringify(result).includes("private"));
    assert.ok(!JSON.stringify(result).includes("safetyreportid"));
  });
}
test("no-match status yields zero records with no inferred approval", async () => {
  const result = await searchFdaEvidence("approvals", "apixaban", board, {
    fetchImpl: () => new Response("Not found", { status: 404 })
  });
  assert.equal(result.dataState, "no_source_matches");
  assert.deepEqual(result.records, []);
});
test("bad upstream status, redirected source, MIME and missing schema fail closed", async () => {
  for (const mock of [
    () => new Response("bad", { status: 500 }),
    () => new Response("html", { status: 200, headers: { "content-type": "text/html" } }),
    () => new Response(JSON.stringify({ fake: [] }), { status: 200, headers: { "content-type": "application/json" } }),
    () => ({ redirected: true, status: 200, ok: true })
  ]) {
    await assert.rejects(searchFdaEvidence("recalls", "apixaban", board, { fetchImpl: mock }), { statusCode: 503 });
  }
});
test("oversized source response is rejected and never returned", async () => {
  await assert.rejects(searchFdaEvidence("ndc", "apixaban", board, {
    fetchImpl: () => new Response(JSON.stringify({ results: [{ excessive: "x".repeat(300000) }] }), { headers: { "content-type": "application/json" } })
  }), { statusCode: 503 });
});
