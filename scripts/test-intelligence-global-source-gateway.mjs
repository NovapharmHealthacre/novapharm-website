import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGovSourcePlan,
  createGovSourceReader,
  normaliseGovSourceResult,
  sourcePlans
} from "../src/core/intelligence-global-source-gateway.mjs";
import {
  assertInternalEvaluationPermit,
  buildEvaluationEnvelope,
  validateSourceEvidenceAdmission
} from "../src/core/intelligence-global-evidence-contract.mjs";

const TEST_NOW = Date.parse("2026-11-17T17:00:00.000Z");
function permit({ sourceId = "global-clinicaltrials", tenantId = "tenant1", country = "GLOBAL", domain = "clinical-trials", ...overrides } = {}) {
  return {
    decision: "approved",
    rightsStatus: "approved",
    sourceId, tenantId, country, domain, purpose: "internal-evaluation",
    allowedUses: ["internal-evaluation"],
    receiptId: "receipt-test-001",
    licenseId: "lic-test-001",
    rightsVersion: "rights-v1",
    issuedAt: "2026-11-17T16:00:00.000Z",
    validUntil: "2026-11-17T18:00:00.000Z",
    revokedAt: null,
    ...overrides
  };
}


test("only nine documented HTTPS source plans are reachable through fixed-path plans", () => {
  assert.equal(Object.keys(sourcePlans).length, 9);
  for (const sourceId of Object.keys(sourcePlans)) {
    const p = buildGovSourcePlan({ sourceId, term: "Apixaban", limit: 5 });
    assert.equal(new URL(p.url).protocol, "https:");
    assert.equal(new URL(p.url).origin, sourcePlans[sourceId].origin);
    assert.ok(new URL(p.url).pathname.startsWith(sourcePlans[sourceId].path));
  }
  assert.match(buildGovSourcePlan({ sourceId: "global-clinicaltrials", term: "Apixaban" }).url, /pageSize=5/);
  assert.match(buildGovSourcePlan({ sourceId: "es-aemps-cima", term: "Apixaban" }).url, /nombre=Apixaban/);
  assert.match(buildGovSourcePlan({ sourceId: "ca-health-canada-dpd", term: "Apixaban" }).url, /brandname=Apixaban/);
  assert.match(buildGovSourcePlan({ sourceId: "global-europepmc", term: "Apixaban" }).url, /pageSize=5/);
  assert.match(buildGovSourcePlan({ sourceId: "global-pubmed", term: "Apixaban" }).url, /esearch.fcgi\?db=pubmed.*retmax=5.*retmode=json/);
  assert.match(buildGovSourcePlan({ sourceId: "global-chembl", term: "Apixaban" }).url, /search.json\?q=Apixaban.*limit=5/);
  assert.match(buildGovSourcePlan({ sourceId: "global-pubchem", term: "Apixaban" }).url, /compound\/name\/Apixaban\/cids\/JSON/);
  assert.match(buildGovSourcePlan({ sourceId: "pl-nfz-drug-program", term: "Apixaban" }).url, /drug-costs-by-active-substance\?active-substance=Apixaban.*limit=5.*format=json/);
});
test("bounds reject query injection, unsupported hosts and unbounded pages", () => {
  for (const term of ['" OR true', "https://evil.example", "a", " ".repeat(100), "a\nb"]) {
    assert.throws(() => buildGovSourcePlan({ sourceId: "us-fda-drugsfda", term }));
  }
  for (const sourceId of ["evil", "__proto__", "constructor", "toString"]) {
    assert.throws(() => buildGovSourcePlan({ sourceId, term: "Apixaban" }), /Unsupported source/);
  }
  assert.throws(() => buildGovSourcePlan({ sourceId: "us-fda-drugsfda", term: "Apixaban", limit: 500 }));
});
test("missing or expired rights deny BEFORE any outgoing request", async () => {
  let count = 0;
  const transport = async () => { count++; throw new Error("must never connect"); };
  const denied = createGovSourceReader({ authorize: async () => ({ decision: "denied" }), transport });
  await assert.rejects(denied.read({ sourceId: "global-clinicaltrials", term: "Apixaban", tenantId: "tenant1" }), /not approved/);
  const stale = createGovSourceReader({ authorize: async () => (permit({ validUntil: "2025-01-01T00:00:00Z" })), transport });
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
    authorize: async (input) => permit(input),
    now: () => TEST_NOW,
    transport
  });
  const result = await reader.read({ sourceId: "global-clinicaltrials", term: "Apixaban", tenantId: "tenant1" });
  assert.equal(result.canPublish, false);
  assert.equal(result.dataState, "unreconciled_upstream_preview");
  assert.equal(result.responseSha256.length, 64);
  assert.equal(result.rightsReceiptId, "receipt-test-001");
  assert.equal(result.publishDecision, "DENIED_UNTIL_INDEPENDENT_DATA_ADMISSION");
  assert.deepEqual(validateSourceEvidenceAdmission(result), { admitted: false, reason: "INDEPENDENT_ADMISSION_REQUIRED" });
  assert.equal(result.records[0].localId, "NCT01234567");
  assert.equal(options.redirect, "error");
  assert.equal(options.credentials, "omit");
});
test("upstream HTML, oversized JSON and unexpected schema fail closed", async () => {
  const auth = async (input) => permit(input);
  for (const transport of [
    async () => new Response("<html></html>", { headers: { "content-type": "text/html" } }),
    async () => new Response(JSON.stringify({ studies: [] }), { headers: { "content-type": "application/json", "content-length": "500000" } }),
    async () => new Response(JSON.stringify({ wrong: [] }), { headers: { "content-type": "application/json" } })
  ]) {
    const reader = createGovSourceReader({ authorize: auth, transport, now: () => TEST_NOW });
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

test("Canadian DINs and Europe PMC publication IDs remain provenance-separated and non-publishable", () => {
  const canada = normaliseGovSourceResult(buildGovSourcePlan({ sourceId: "ca-health-canada-dpd", term: "Apixaban" }), [
    { drug_identification_number: "00326925", brand_name: "Canadian example" }
  ]);
  const literature = normaliseGovSourceResult(buildGovSourcePlan({ sourceId: "global-europepmc", term: "Apixaban" }), {
    resultList: { result: [{ id: "12345678", title: "Research example" }] }
  });
  assert.equal(canada.jurisdiction, "CA");
  assert.equal(canada.records[0].localId, "00326925");
  assert.equal(literature.jurisdiction, "GLOBAL");
  assert.equal(literature.records[0].localId, "12345678");
  assert.equal(canada.canPublish, false);
  assert.equal(literature.canPublish, false);
});

test("source-specific grant refuses cross-tenant, cross-source, revoked and overlong licences before a network call", async () => {
  const invalidGrants = [
    { tenantId: "other-tenant" },
    { sourceId: "es-aemps-cima" },
    { country: "ES" },
    { domain: "regulatory" },
    { allowedUses: ["customer-redistribution"] },
    { rightsStatus: "pending" },
    { purpose: "customer-delivery" },
    { revokedAt: "2026-11-17T16:30:00.000Z" },
    { validUntil: "2026-11-20T18:00:00.000Z" },
    { receiptId: "" },
    { licenseId: "" },
    { rightsVersion: "" }
  ];
  let outgoing = 0;
  for (const overrides of invalidGrants) {
    const reader = createGovSourceReader({
      authorize: async (context) => permit({ ...context, ...overrides }),
      now: () => TEST_NOW,
      transport: async () => { outgoing++; throw new Error("unexpected network"); }
    });
    await assert.rejects(
      reader.read({ sourceId: "global-clinicaltrials", term: "Apixaban", tenantId: "tenant1" }),
      /not approved/
    );
  }
  assert.equal(outgoing, 0);
});

test("unapproved candidate cannot turn evaluation records into publishable evidence", () => {
  assert.throws(() => validateSourceEvidenceAdmission({ canPublish: true }), /cannot be published/);
  assert.throws(() => validateSourceEvidenceAdmission({}), /cannot be published/);
  assert.throws(() => buildEvaluationEnvelope({ plan: {}, normalized: { canPublish: true }, raw: {}, grant: {}, capturedAt: TEST_NOW }), /Invalid/);
});

test("evaluation metadata fingerprint changes when raw source payload changes", () => {
  const plan = buildGovSourcePlan({ sourceId: "global-clinicaltrials", term: "Apixaban" });
  const grant = assertInternalEvaluationPermit({
    permit: permit(), sourceId: plan.sourceId, tenantId: "tenant1",
    domain: plan.domain, country: plan.country, now: TEST_NOW
  });
  const a = { studies: [{ protocolSection: { identificationModule: { nctId: "NCT00000001", briefTitle: "A" } } }] };
  const b = { studies: [{ protocolSection: { identificationModule: { nctId: "NCT00000001", briefTitle: "B" } } }] };
  const first = buildEvaluationEnvelope({ plan, normalized: normaliseGovSourceResult(plan, a), raw: a, grant, capturedAt: TEST_NOW });
  const second = buildEvaluationEnvelope({ plan, normalized: normaliseGovSourceResult(plan, b), raw: b, grant, capturedAt: TEST_NOW });
  assert.notEqual(first.responseSha256, second.responseSha256);
  assert.equal(first.canPublish, false);
});

test("PubMed, ChEMBL and PubChem retain database-specific identifiers without suggesting clinical conclusions", () => {
  const cases = [
    { sourceId: "global-pubmed", raw: { esearchresult: { idlist: ["12345678"] } }, localId: "12345678" },
    { sourceId: "global-chembl", raw: { molecules: [{ molecule_chembl_id: "CHEMBL25", pref_name: "Aspirin" }] }, localId: "CHEMBL25" },
    { sourceId: "global-pubchem", raw: { IdentifierList: { CID: [2244] } }, localId: "2244" }
  ];
  for (const x of cases) {
    const plan = buildGovSourcePlan({ sourceId: x.sourceId, term: "Apixaban" });
    const result = normaliseGovSourceResult(plan, x.raw);
    assert.equal(result.records[0].localId, x.localId);
    assert.equal(result.jurisdiction, "GLOBAL");
    assert.equal(result.canPublish, false);
    assert.equal(result.dataState, "unreconciled_upstream_preview");
  }
  assert.equal(
    normaliseGovSourceResult(buildGovSourcePlan({ sourceId: "global-pubchem", term: "Apixaban" }), { IdentifierList: { CID: [-1, 12.5] } }).records.length, 0
  );
});
test("new global discovery adapters reject non-JSON or unrecognized schema", () => {
  for (const sourceId of ["global-pubmed", "global-chembl", "global-pubchem"]) {
    assert.throws(() => normaliseGovSourceResult(buildGovSourcePlan({ sourceId, term: "Apixaban" }), {}), /Unexpected source schema/);
    assert.throws(() => buildGovSourcePlan({ sourceId, term: "a/b" }), /Invalid search term/);
  }
});

test("Polish NFZ keeps active-substance codes and does not manufacture price or market share", () => {
  const plan = buildGovSourcePlan({ sourceId: "pl-nfz-drug-program", term: "Apixaban" });
  const result = normaliseGovSourceResult(plan, {
    meta: { count: 1, page: 1 },
    data: [{ data: [{ "active-substance-code": "010203", "active-substance-name": "APIXABANUM", refund: 2500 }] }]
  });
  assert.equal(result.records[0].localId, "010203");
  assert.equal(result.records[0].label, "APIXABANUM");
  assert.equal(result.records[0].provenanceDomain, "NFZ drug-program reimbursement (substance identity only)");
  assert.equal(result.jurisdiction, "PL");
  assert.equal(result.canPublish, false);
  assert.equal(Object.hasOwn(result.records[0], "refund"), false);
  assert.equal(Object.hasOwn(result.records[0], "price"), false);
  assert.equal(result.dataState, "unreconciled_upstream_preview");
  assert.throws(() => normaliseGovSourceResult(plan, {wrong:[]}), /Unexpected source schema/);
});

test("invalid trusted clocks and noncanonical permit timestamps reject before any outgoing request", async () => {
  let outgoing = 0;
  for (const clock of [NaN, Infinity, -Infinity, undefined, "2026-11-17T17:00:00.000Z"]) {
    const reader = createGovSourceReader({
      authorize: async context => permit(context),
      now: () => clock,
      transport: async () => { outgoing++; throw Error("transport must never run"); }
    });
    await assert.rejects(reader.read({ sourceId: "global-clinicaltrials", term: "Apixaban", tenantId: "tenant1" }), /not approved/);
  }
  for (const changes of [
    { issuedAt: "2026-11-17T16:00:00+00:00" },
    { validUntil: "2026-11-17T18:00:00+00:00" },
    { issuedAt: "2026-11-31T16:00:00.000Z" },
    { issuedAt: 1234 }
  ]) {
    const reader = createGovSourceReader({
      authorize: async context => permit({ ...context, ...changes }),
      now: () => TEST_NOW,
      transport: async () => { outgoing++; throw Error("transport must never run"); }
    });
    await assert.rejects(reader.read({ sourceId: "global-clinicaltrials", term: "Apixaban", tenantId: "tenant1" }), /not approved/);
  }
  assert.equal(outgoing, 0);
});

test("a permit expiring during fetch cannot produce an evaluation envelope", async () => {
  let calls = 0, clockReads = 0;
  const reader = createGovSourceReader({
    authorize: async context => permit({ ...context, validUntil: "2026-11-17T17:01:00.000Z" }),
    now: () => ++clockReads === 1 ? TEST_NOW : TEST_NOW + 61_000,
    transport: async () => {
      calls++;
      return new Response(JSON.stringify({ studies: [{ protocolSection: { identificationModule: { nctId: "NCT00000001", briefTitle: "Synthetic" } } }] }), { headers: { "content-type": "application/json" } });
    }
  });
  await assert.rejects(reader.read({ sourceId: "global-clinicaltrials", term: "Apixaban", tenantId: "tenant1" }), /Invalid evaluation envelope/);
  assert.equal(calls, 1);
});
