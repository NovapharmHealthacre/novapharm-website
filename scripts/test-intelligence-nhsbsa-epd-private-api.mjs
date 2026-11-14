import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { inspectNhsbsaEpdPrivateApi } from "../src/core/intelligence-nhsbsa-epd-private-api.mjs";

const ids = Object.freeze({
  july: "11111111-1111-4111-8111-111111111111",
  august: "22222222-2222-4222-8222-222222222222",
});
const bnfCode = "0208020Z0AAACAC";
const packageResult = {
  success: true,
  result: {
    name: "english-prescribing-dataset-epd-with-snomed-code",
    license_id: "OGL-UK-3.0",
    resources: [
      { name: "EPD_SNOMED_202608", id: ids.august, datastore_active: true,
        sha256: "a".repeat(64) },
      { name: "EPD_SNOMED_202607", id: ids.july, datastore_active: true,
        sha256: "b".repeat(64) },
      { name: "wrong-resource", id: "33333333-3333-4333-8333-333333333333", datastore_active: true },
    ],
  },
};
const dataResult = {
  success: true,
  result: { records: [{
    YEAR_MONTH: "202608", PRACTICE_CODE: "A81001",
    BNF_PRESENTATION_CODE: bnfCode, SNOMED_CODE: "UNLICENCED-SNOMED-NOT-FOR-OUTPUT",
    BNF_PRESENTATION_NAME: "UNLICENCED-BNF-NAME-NOT-FOR-OUTPUT",
    ITEMS: 13, NIC: 47.4,
  }] },
};
const release = Object.freeze({
  privateReviewEnabled: true, serverVerifiedBoardSession: true,
  clock: () => Date.parse("2026-11-14T11:00:00.000Z"),
});
const respond = object => new Response(JSON.stringify(object), {
  status: 200, headers: { "content-type": "application/json" },
});
function provider({ pkg = packageResult, data = dataResult, collect = [] } = {}) {
  return async (url, init) => {
    const u = new URL(url);
    collect.push(u);
    assert.equal(u.origin, "https://opendata.nhsbsa.net");
    assert.match(u.pathname, /^\/api\/3\/action\/(?:package_show|datastore_search)$/u);
    assert.equal(init.method, "GET");
    assert.equal(init.redirect, "error");
    assert.equal(init.headers.accept, "application/json");
    assert.ok(init.signal);
    if (u.pathname.endsWith("package_show")) {
      assert.deepEqual([...u.searchParams.keys()], ["id"]);
      assert.equal(u.searchParams.get("id"), "english-prescribing-dataset-epd-with-snomed-code");
      return respond(pkg);
    }
    assert.equal(u.searchParams.get("offset"), "0");
    assert.equal(u.searchParams.get("limit"), "2");
    return respond(data);
  };
}

test("unverified and invalid requests never call NHSBSA", async () => {
  let invoked = 0;
  const fetchImpl = async () => { invoked += 1; throw new Error("never called"); };
  await assert.rejects(inspectNhsbsaEpdPrivateApi({ fetchImpl }), e => e.statusCode === 403);
  await assert.rejects(inspectNhsbsaEpdPrivateApi({
    privateReviewEnabled: true, fetchImpl,
  }), e => e.statusCode === 403);
  await assert.rejects(inspectNhsbsaEpdPrivateApi({
    ...release, fetchImpl, presentationCode: "apixaban",
  }), e => e.statusCode === 400);
  await assert.rejects(inspectNhsbsaEpdPrivateApi({
    ...release, fetchImpl, presentationCode: "0208020Z0AA; DROP",
  }), e => e.statusCode === 400);
  await assert.rejects(inspectNhsbsaEpdPrivateApi({
    ...release, fetchImpl, period: "2026-15",
  }), e => e.statusCode === 400);
  for (const limit of [0, 6, 1.5, NaN, "100"]) {
    await assert.rejects(inspectNhsbsaEpdPrivateApi({ ...release, limit, fetchImpl }),
      e => e.statusCode === 400);
  }
  assert.equal(invoked, 0);
});

test("selected publisher resource is exact and bounded, returned fields exclude third-party terminology", async () => {
  const calls = [];
  const result = await inspectNhsbsaEpdPrivateApi({
    ...release, presentationCode: bnfCode.toLowerCase(), fetchImpl: provider({ collect: calls }),
  });
  assert.equal(calls.length, 2);
  const query = calls[1];
  assert.equal(query.searchParams.get("resource_id"), ids.august);
  assert.deepEqual(JSON.parse(query.searchParams.get("filters")), { BNF_PRESENTATION_CODE: bnfCode });
  assert.equal(result.period, "2026-08");
  assert.equal(result.resourceId, ids.august);
  assert.equal(result.publisherDeclaredCsvSha256, "a".repeat(64));
  assert.equal(result.matchedRowsInBoundedSample, 1);
  assert.equal(result.sampleRows[0].observedItemsUnapproved, 13);
  assert.equal(result.sampleRows[0].observedNicGbpUnapproved, 47.4);
  assert.match(result.sampleRows[0].sourceRowSha256, /^[a-f0-9]{64}$/u);
  const output = JSON.stringify(result);
  assert.ok(!output.includes("UNLICENCED-"), "Do not emit raw third-party terminology fields");
  assert.ok(!output.includes("A81001"), "Do not emit identifiable practice codes");
  assert.equal(result.thirdPartyTerminologyRightsVerified, false);
  assert.equal(result.sourceRightsVerified, false);
  assert.equal(result.medicineIdentityAccepted, false);
  assert.equal(result.commercialPublicationApproved, false);
  assert.equal(result.customerAccessEnabled, false);
  assert.equal(result.fullDatasetReconciled, false);
  assert.equal(result.status, "private_unapproved_publisher_api_sample");
  assert.equal(result.attribution, "NHSBSA Copyright 2021-2026");
});

test("a dated period is strictly scoped to publisher metadata, never another server", async () => {
  const calls = [];
  const result = await inspectNhsbsaEpdPrivateApi({
    ...release, period: "2026-07",
    fetchImpl: provider({
      collect: calls,
      data: { success: true, result: { records: [] } },
    }),
  });
  assert.equal(result.period, "2026-07");
  assert.equal(result.sampleRows.length, 0);
  assert.equal(calls[1].searchParams.get("resource_id"), ids.july);
  assert.equal(calls[1].searchParams.has("filters"), false);
  const seen = [];
  await assert.rejects(inspectNhsbsaEpdPrivateApi({
    ...release, period: "2026-10", fetchImpl: provider({ collect: seen }),
  }), e => e.statusCode === 404);
  assert.equal(seen.length, 1);
});

test("license changes, unsupported publisher records and mismatched codes fail closed", async () => {
  const changedLicense = structuredClone(packageResult);
  changedLicense.result.license_id = "another-licence";
  await assert.rejects(inspectNhsbsaEpdPrivateApi({
    ...release, fetchImpl: provider({ pkg: changedLicense }),
  }), e => e.statusCode === 502);
  const unavailable = structuredClone(packageResult);
  unavailable.result.resources.forEach(r => { r.datastore_active = false; });
  await assert.rejects(inspectNhsbsaEpdPrivateApi({
    ...release, fetchImpl: provider({ pkg: unavailable }),
  }), e => e.statusCode === 503);
  for (const extra of [
    { YEAR_MONTH: "202607" },
    { BNF_PRESENTATION_CODE: "invalid" },
    { ITEMS: "not a number" },
    { NIC: -2 },
  ]) {
    const invalid = structuredClone(dataResult);
    Object.assign(invalid.result.records[0], extra);
    await assert.rejects(inspectNhsbsaEpdPrivateApi({
      ...release, presentationCode: bnfCode, fetchImpl: provider({ data: invalid }),
    }), e => e.statusCode === 502);
  }
});

test("oversized or failed upstream response does not emit unapproved rows", async () => {
  await assert.rejects(inspectNhsbsaEpdPrivateApi({
    ...release, fetchImpl: async () => new Response("unavailable", {
      status: 503, headers: { "content-type": "text/plain" },
    }),
  }), e => e.statusCode === 502);
  await assert.rejects(inspectNhsbsaEpdPrivateApi({
    ...release, fetchImpl: async () => new Response("x".repeat(2_000_001), {
      status: 200, headers: { "content-type": "application/json" },
    }),
  }), e => e.statusCode === 502);
  const response = await inspectNhsbsaEpdPrivateApi({
    ...release, fetchImpl: provider({ data: { success: true, result: { records: [] } } }),
  });
  assert.equal(response.matchedRowsInBoundedSample, 0);
  assert.equal(response.sourceRightsVerified, false);
});

test("the only HTTP entrypoint is private, explicitly feature gated and board authenticated", () => {
  const server = readFileSync(new URL("../server.mjs", import.meta.url), "utf8");
  const start = server.indexOf('if (pathname === "/api/v1/intelligence/sources/nhsbsa/epd/private-probe"');
  const end = server.indexOf('if (pathname === "/api/v1/intelligence/readiness"', start);
  assert.ok(start >= 0 && end > start, "Private route is required");
  const route = server.slice(start, end);
  assert.match(route, /rateLimit\(request, "nhsbsa-private-source-probe", 4, 60 \* 1000\)/u);
  const board = route.indexOf('scopedAuthentication(request, response, ["board"])');
  const flag = route.indexOf('process.env.NPI_NHSBSA_PRIVATE_API_PROBE_ENABLED !== "true"');
  const source = route.indexOf("inspectNhsbsaEpdPrivateApi");
  assert.ok(board >= 0 && flag > board && source > flag);
  assert.match(route, /serverVerifiedBoardSession: true/u);
  assert.match(route, /privateReviewEnabled: true/u);
});
