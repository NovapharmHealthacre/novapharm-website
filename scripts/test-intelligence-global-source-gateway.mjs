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


test("only five documented HTTPS hosts are reachable through fixed-path plans", () => {
  assert.equal(Object.keys(sourcePlans).length, 5);
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

test("missing, invalid or spoofed server clocks never authorize an upstream request", async () => {
  let outgoing = 0;
  for (const badNow of [NaN, undefined, null, Infinity, -Infinity, -1, "2026-11-17T17:00:00Z", {}, TEST_NOW + 0.5]) {
    const reader = createGovSourceReader({
      authorize: async (context) => permit(context),
      now: () => badNow,
      transport: async () => {
        outgoing++;
        throw new Error("upstream request must not happen with invalid clock");
      }
    });
    await assert.rejects(
      reader.read({sourceId:"global-clinicaltrials",term:"Apixaban",tenantId:"tenant1"}),
      /not approved/
    );
  }
  assert.equal(outgoing, 0, "No network access on an invalid clock");
});

test("the independent grant checker also fails closed on a NaN or missing clock", () => {
  const plan = buildGovSourcePlan({sourceId:"global-clinicaltrials",term:"Apixaban"});
  const args = {
    permit: permit(), sourceId:plan.sourceId, tenantId:"tenant1",
    domain:plan.domain, country:plan.country
  };
  for(const badNow of [NaN,undefined,null,Infinity,-Infinity,-1,"bad-clock"]) {
    assert.throws(()=>assertInternalEvaluationPermit({...args,now:badNow}),/not approved/);
  }
  assert.equal(assertInternalEvaluationPermit({...args,now:TEST_NOW}).receiptId,"receipt-test-001");
});

test("an approved source receipt cannot return records if the grant expires or clock fails during the upstream fetch", async () => {
  const expiredAt = Date.parse("2026-11-17T18:00:00.000Z");
  for (const afterFetch of [expiredAt, expiredAt + 1, NaN, undefined]) {
    let reads = 0;
    let ticks = 0;
    const reader = createGovSourceReader({
      authorize: async (context) => permit(context),
      now: () => (++ticks === 1 ? TEST_NOW : afterFetch),
      transport: async () => {
        reads++;
        return new Response(JSON.stringify({
          studies: [{protocolSection:{identificationModule:{nctId:"NCT01234567",briefTitle:"Synthetic fixture"}}}]
        }), {headers:{"content-type":"application/json"}});
      }
    });
    await assert.rejects(
      reader.read({sourceId:"global-clinicaltrials",term:"Apixaban",tenantId:"tenant1"}),
      /no longer approved/
    );
    assert.equal(reads,1,"Grant is valid before fetch; data must still be withheld on expiry");
    assert.equal(ticks,2);
  }
});


test("source grants revoked or replaced during upstream fetch are denied before any evidence is returned", async () => {
  const transitions = [
    {revokedAt:"2026-11-17T16:30:00.000Z"},
    {rightsStatus:"pending"},
    {tenantId:"tenant2"},
    {receiptId:"receipt-test-002"},
    {licenseId:"lic-test-002"},
    {rightsVersion:"rights-v2"},
    {validUntil:"2026-11-17T17:45:00.000Z"}
  ];
  for (const changed of transitions) {
    let authorizations = 0;
    let reads = 0;
    const reader = createGovSourceReader({
      authorize: async (context) => permit({
        ...context, ...(++authorizations === 1 ? {} : changed)
      }),
      now: () => TEST_NOW,
      transport: async () => {
        reads++;
        return new Response(JSON.stringify({
          studies:[{protocolSection:{identificationModule:{
            nctId:"NCT01234567",briefTitle:"Synthetic fixture"
          }}}]
        }),{headers:{"content-type":"application/json"}});
      }
    });
    await assert.rejects(
      reader.read({sourceId:"global-clinicaltrials",term:"Apixaban",tenantId:"tenant1"}),
      /not approved|changed during evaluation/,
      JSON.stringify(changed)
    );
    assert.equal(reads,1,"The original permit allowed the test-only transport");
    assert.equal(authorizations,2,"Rights must be independently rechecked after fetch");
  }
});

test("stable, revalidated source grant remains internal-only after a successful lookup", async () => {
  let authorizations = 0;
  const reader = createGovSourceReader({
    authorize: async context => {authorizations++;return permit(context);},
    now: () => TEST_NOW,
    transport: async () => new Response(JSON.stringify({
      studies:[{protocolSection:{identificationModule:{
        nctId:"NCT01234567",briefTitle:"Synthetic fixture"
      }}}]
    }),{headers:{"content-type":"application/json"}})
  });
  const result = await reader.read({
    sourceId:"global-clinicaltrials",term:"Apixaban",tenantId:"tenant1"
  });
  assert.equal(authorizations,2);
  assert.equal(result.canPublish,false);
  assert.equal(result.clinicalDecisionReady,false);
  assert.equal(result.rightsReceiptId,"receipt-test-001");
});


test("trusted source clock must never move backwards after an approved read", async () => {
  const rollback = Date.parse("2026-11-17T16:59:59.000Z");
  let reads = 0, clocks = 0, permissions = 0;
  const reader = createGovSourceReader({
    authorize: async context => { permissions++; return permit(context); },
    now: () => (++clocks === 1 ? TEST_NOW : rollback),
    transport: async () => {
      reads++;
      return new Response(JSON.stringify({
        studies: [{protocolSection:{identificationModule:{
          nctId:"NCT01234567", briefTitle:"Synthetic only"
        }}}]
      }), {headers:{"content-type":"application/json"}});
    }
  });
  await assert.rejects(
    reader.read({sourceId:"global-clinicaltrials",term:"Apixaban",tenantId:"tenant1"}),
    /no longer approved/
  );
  assert.equal(reads, 1, "One already-approved upstream test request was allowed");
  assert.equal(permissions, 2, "Permit still rechecked after source read");
  assert.equal(clocks, 2);
  assert.throws(() => createGovSourceReader({
    authorize:async context => permit(context),
    transport:async()=>{ throw new Error("unused"); },
    now: "not a clock"
  }), /Trusted authorizer and transport/);
});
