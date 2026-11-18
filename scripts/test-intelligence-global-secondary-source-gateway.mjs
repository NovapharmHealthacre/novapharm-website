import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  secondarySourcePlans, buildSecondarySourcePlan,
  normaliseSecondarySourceResult, createSecondarySourceReader
} from "../src/core/intelligence-global-secondary-source-gateway.mjs";

const NOW = Date.parse("2026-11-18T07:00:00.000Z");
const HSA_DATASET = "d_767279312753558cbf19d48344577084";
const HSA_FIELDS = Object.freeze([{ id: "LicenceNo" }, { id: "Productname" }]);
const sample = (sourceId = "sg-hsa-products", term = "Apixaban", limit = 5) =>
  buildSecondarySourcePlan({ sourceId, term, limit });
const authGrant = (ctx, overrides = {}) => ({
  decision: "approved", rightsStatus: "approved",
  ...ctx, allowedUses: ["internal-evaluation"],
  receiptId: "synthetic-test-receipt", licenseId: "synthetic-test-only",
  rightsVersion: "synthetic-v1",
  issuedAt: "2026-11-18T06:00:00.000Z",
  validUntil: "2026-11-18T08:00:00.000Z",
  revokedAt: null, ...overrides
});
const json = (payload) => new Response(JSON.stringify(payload), {
  headers: { "content-type": "application/json" }
});

test("two distinct national API plans remain HTTPS origin/path allowlisted", () => {
  assert.equal(Object.keys(secondarySourcePlans).length, 2);
  for (const [sourceId, source] of Object.entries(secondarySourcePlans)) {
    const plan = sample(sourceId);
    const url = new URL(plan.url);
    assert.equal(url.protocol, "https:");
    assert.equal(url.origin, source.origin);
    assert.ok(url.pathname.startsWith(source.path));
    assert.equal(plan.country, source.country);
    assert.equal(plan.domain, source.domain);
    assert.equal(plan.candidateKey, source.candidateKey);
  }
  assert.equal(new URL(sample("sg-hsa-products").url).searchParams.get("resource_id"),
    "d_767279312753558cbf19d48344577084");
  assert.deepEqual(JSON.parse(new URL(sample("sg-hsa-products").url).searchParams.get("q")),
    { Productname: "Apixaban" });
});

test("every added API candidate has a corresponding source record without falsely activating it", () => {
  const register = JSON.parse(readFileSync(
    new URL("../docs/intelligence/global-pharma-sources-20261117.json", import.meta.url), "utf8"
  ));
  for (const plan of Object.values(secondarySourcePlans)) {
    const record = register.sources.find((item) => item.candidateKey === plan.candidateKey);
    assert.ok(record, "Missing registry candidate: " + plan.candidateKey);
    assert.equal(record.rightsStatus, "not-reviewed");
    assert.equal(record.integrationStatus, "candidate-only");
    assert.equal(record.dataAdmission, "not-admitted");
  }
});

test("invalid source IDs, query controls, bypasses and oversized pages fail before transport", () => {
  for (const sourceId of ["__proto__", "constructor", "evil", "", null]) {
    assert.throws(() => sample(sourceId), /Unsupported source/);
  }
  for (const term of ["x", "   ", "https://evil.test", "test\nbad", "\u202eabc", "a".repeat(73)]) {
    assert.throws(() => buildSecondarySourcePlan({ sourceId: "sg-hsa-products", term }), /Invalid/);
  }
  for (const limit of [0, 11, 1000, 1.5, "2"]) {
    assert.throws(() => buildSecondarySourcePlan({ sourceId: "sg-hsa-products", term: "Apixaban", limit }), /Invalid/);
  }
});

test("country-local medicine codes and global research identifiers never become publishable", () => {
  const sg = normaliseSecondarySourceResult(sample("sg-hsa-products"), {
    success: true, result: { resource_id: HSA_DATASET, fields: HSA_FIELDS, records: [
      { LicenceNo: "SIN00001P", Productname: "Example 1 mg" },
      { LicenceNo: "\u202eSIN999", Productname: "Spoofed" },
      { LicenceNo: "SIN00002P", Productname: "a".repeat(241) }
    ] }
  });
  assert.equal(sg.records.length, 1);
  assert.equal(sg.records[0].localId, "SIN00001P");
  assert.equal(sg.canPublish, false);
  assert.equal(sg.jurisdiction, "SG");
  const catalogue = normaliseSecondarySourceResult(sample("gb-nhsbsa-dataset-catalogue"), {
    success: true, result: { results: [{ id: "dataset-001", title: "English prescribing dataset" }] }
  });
  assert.equal(catalogue.records[0].localId, "dataset-001");
  assert.equal(catalogue.jurisdiction, "GB");
  assert.equal(catalogue.canPublish, false);
});

test("unexpected upstream schemas never yield medicine evidence", () => {
  for (const sourceId of Object.keys(secondarySourcePlans)) {
    assert.throws(() => normaliseSecondarySourceResult(sample(sourceId), {}), /Unexpected (?:source schema|HSA resource identity or schema)/);
  }
});

test("unapproved and expired permits deny outbound requests without network activity", async () => {
  let outgoing = 0;
  const transport = async () => { outgoing++; return json({}); };
  for (const authorize of [
    async () => ({ decision: "approved" }),
    async (ctx) => authGrant(ctx, { tenantId: "other-tenant" }),
    async (ctx) => authGrant(ctx, { purpose: "customer-delivery" }),
    async (ctx) => authGrant(ctx, { revokedAt: "2026-11-18T06:30:00Z" }),
    async (ctx) => authGrant(ctx, { validUntil: "2026-11-18T06:30:00Z" })
  ]) {
    const reader = createSecondarySourceReader({ authorize, transport, now: () => NOW });
    await assert.rejects(reader.read({ sourceId: "sg-hsa-products", term: "Apixaban", tenantId: "tenantA" }));
  }
  assert.equal(outgoing, 0);
});

test("mock-authorized internal HSA read is bounded and non-publishable", async () => {
  let requestConfig;
  const reader = createSecondarySourceReader({
    authorize: async (ctx) => authGrant(ctx),
    transport: async (url, config) => {
      requestConfig = config;
      assert.equal(new URL(url).hostname, "data.gov.sg");
      return json({ success: true, result: { resource_id: HSA_DATASET, fields: HSA_FIELDS, records: [
        { LicenceNo: "SIN00001P", Productname: "Test pack" }
      ] } });
    },
    now: () => NOW
  });
  const result = await reader.read({ sourceId: "sg-hsa-products", term: "Apixaban", tenantId: "tenantA" });
  assert.equal(result.canPublish, false);
  assert.equal(result.publishDecision, "DENIED_UNTIL_INDEPENDENT_DATA_ADMISSION");
  assert.equal(result.clinicalDecisionReady, false);
  assert.equal(result.commercialDecisionReady, false);
  assert.equal(result.responseSha256.length, 64);
  assert.equal(result.records[0].localId, "SIN00001P");
  assert.equal(requestConfig.method, "GET");
  assert.equal(requestConfig.redirect, "error");
  assert.equal(requestConfig.credentials, "omit");
  assert.equal(requestConfig.cache, "no-store");
});

test("a grant that expires while the request executes cannot return results", async () => {
  let clocks = [NOW, Date.parse("2026-11-18T08:00:00Z")];
  const reader = createSecondarySourceReader({
    authorize: async (ctx) => authGrant(ctx),
    transport: async () => json({ success: true, result: { resource_id: HSA_DATASET, fields: HSA_FIELDS, records: [{ LicenceNo: "SIN00001P", Productname: "Test medicine" }] } }),
    now: () => clocks.shift()
  });
  await assert.rejects(
    reader.read({ sourceId: "sg-hsa-products", term: "Apixaban", tenantId: "tenantA" }),
    /expired/
  );
});

test("invalid server clocks and malformed upstream media/stream fail closed", async () => {
  let networkCalls = 0;
  const badClock = createSecondarySourceReader({
    authorize: async (ctx) => authGrant(ctx),
    transport: async () => { networkCalls++; return json({}); },
    now: () => NaN
  });
  await assert.rejects(badClock.read({
    sourceId: "sg-hsa-products", term: "Apixaban", tenantId: "tenantA"
  }), /Invalid trusted server time/);
  assert.equal(networkCalls, 0);
  for (const transport of [
    async () => new Response("<html></html>", { headers: { "content-type": "text/html" } }),
    async () => new Response(JSON.stringify({ IdentifierList: { CID: [1] } }), {
      headers: { "content-type": "application/json", "content-length": "500000" }
    }),
    async () => new Response("x".repeat(262145), {
      headers: { "content-type": "application/json" }
    })
  ]) {
    const reader = createSecondarySourceReader({
      authorize: async (ctx) => authGrant(ctx), transport, now: () => NOW
    });
    await assert.rejects(reader.read({
      sourceId: "sg-hsa-products", term: "Apixaban", tenantId: "tenantA"
    }));
  }
});


test("revoked, changed or unavailable source rights after transport block preview", async () => {
  const payload = { success: true, result: { resource_id: HSA_DATASET, fields: HSA_FIELDS, records: [
    { LicenceNo: "SIN00001P", Productname: "Test medicinal product" }
  ] } };
  const secondDecisions = [
    (ctx) => authGrant(ctx, { revokedAt: "2026-11-18T07:00:00Z" }),
    (ctx) => authGrant(ctx, { receiptId: "different-rights-receipt" }),
    (ctx) => authGrant(ctx, { rightsVersion: "rights-v2" }),
    (ctx) => authGrant(ctx, { licenseId: "different-licence" }),
    (ctx) => authGrant(ctx, { tenantId: "other-tenant" }),
    () => { throw new Error("backend rights service unavailable"); }
  ];
  for (const second of secondDecisions) {
    let authorizations = 0, outgoing = 0;
    const reader = createSecondarySourceReader({
      authorize: async (ctx) => (++authorizations === 1 ? authGrant(ctx) : second(ctx)),
      transport: async () => { outgoing++; return json(payload); },
      now: () => NOW
    });
    await assert.rejects(
      reader.read({ sourceId: "sg-hsa-products", term: "Apixaban", tenantId: "tenantA" }),
      /Source rights (revoked|changed) during upstream request/
    );
    assert.equal(authorizations, 2);
    assert.equal(outgoing, 1);
  }
});

test("invalid trusted clock after completed fetch blocks result before delivery", async () => {
  let calls = 0;
  const reader = createSecondarySourceReader({
    authorize: async (ctx) => authGrant(ctx),
    transport: async () => json({success: true, result: {resource_id: HSA_DATASET, fields: HSA_FIELDS, records: [
      { LicenceNo: "SIN00001P", Productname: "Test" }
    ]}}),
    now: () => (++calls === 3 ? NaN : NOW)
  });
  await assert.rejects(
    reader.read({ sourceId: "sg-hsa-products", term: "Apixaban", tenantId: "tenantA" }),
    /Source rights revoked during upstream request/
  );
});


test("Singapore HSA responses must attest the exact national dataset and required columns", () => {
  const plan = sample("sg-hsa-products");
  const example = { LicenceNo: "SIN00001P", Productname: "Test medicinal product" };
  const valid = { success: true, result: {
    resource_id: HSA_DATASET, fields: HSA_FIELDS, records: [example]
  }};
  const ok = normaliseSecondarySourceResult(plan, valid);
  assert.equal(ok.records[0].localId, "SIN00001P");
  const bad = [
    { ...valid, result: { ...valid.result, resource_id: "d_otherdataset" } },
    { ...valid, result: { ...valid.result, resource_id: undefined } },
    { ...valid, result: { ...valid.result, fields: [] } },
    { ...valid, result: { ...valid.result, fields: [{id:"LicenceNo"}] } },
    { ...valid, result: { ...valid.result, fields: [{id:"Productname"}] } },
    { ...valid, result: { ...valid.result, records: Array(11).fill(example) } }
  ];
  for (const raw of bad) {
    assert.throws(() => normaliseSecondarySourceResult(plan, raw), /Unexpected HSA resource identity or schema/);
  }
});
