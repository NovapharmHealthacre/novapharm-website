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
    data: { sums: { refund: 2500 }, data: [{ "active-substance-code": "010203", "active-substance-name": "APIXABANUM", refund: 2500 }] }
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
  // Old test fixtures incorrectly assumed a top-level array. Real NFZ examples
  // require data.sums + data.data; rejecting this prevents silent empty pages.
  assert.throws(() => normaliseGovSourceResult(plan, {
    data: [{ data: [{ "active-substance-code": "010203", "active-substance-name": "APIXABANUM" }] }]
  }), /Unexpected source schema/);
  assert.throws(() => normaliseGovSourceResult(plan, {data: {sums: {}, data: {}}}), /Unexpected source schema/);
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
    { issuedAt: 1234 },
    { issuedAt: Symbol("bad-identity-date") },
    { validUntil: Symbol("bad-expiration-date") },
    { validUntil: { toString: () => { throw Error("untrusted coercion"); } } }
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

test("trusted source authorizer, upstream transport and clock failures suppress internal details", async () => {
  const secret = "SECRET_PRIVATE_SOURCE_PROVIDER_CREDENTIAL";
  const bad = async () => { throw new Error(secret); };
  for (const reader of [
    createGovSourceReader({ authorize: bad, transport: async () => { throw Error("should not reach"); }, now: () => TEST_NOW }),
    createGovSourceReader({ authorize: async context => permit(context), transport: bad, now: () => TEST_NOW }),
    createGovSourceReader({ authorize: async context => permit(context), transport: bad, now: () => { throw Error(secret); } })
  ]) {
    await assert.rejects(
      reader.read({ sourceId: "global-clinicaltrials", term: "Apixaban", tenantId: "tenant1" }),
      (error) => error instanceof Error && !error.message.includes(secret) &&
        /not approved|Upstream unavailable/.test(error.message)
    );
  }
});

test("malformed upstream response objects and stream exceptions never leak backend details", async () => {
  const secret = "SECRET_REMOTE_PROVIDER_AUTH_HEADER";
  const responses = [
    { ok: true, headers: { get: () => { throw Error(secret); } } },
    { ok: true, headers: { get: () => "application/json" },
      body: { getReader: () => { throw Error(secret); } } },
    { ok: true, headers: { get: () => "application/json" },
      body: { getReader: () => ({
        read: async () => { throw Error(secret); },
        cancel: async () => {},
        releaseLock: () => {}
      }) } }
  ];
  for (const response of responses) {
    const reader = createGovSourceReader({
      authorize: async ctx => permit(ctx),
      now: () => TEST_NOW,
      transport: async () => response
    });
    await assert.rejects(
      reader.read({ sourceId: "global-clinicaltrials", term: "Apixaban", tenantId: "tenant1" }),
      error => error instanceof Error && error.message === "Upstream unavailable" &&
        !error.message.includes(secret)
    );
  }
});


test("official medicine source identities are preserved exactly, never silently truncated or spoofed", () => {
  const plan = buildGovSourcePlan({ sourceId: "ca-health-canada-dpd", term: "Apixaban" });
  const fullId = "0".repeat(119) + "1";
  const safeLabel = "B".repeat(240);
  const result = normaliseGovSourceResult(plan, [
    { drug_identification_number: fullId, brand_name: safeLabel },
    { drug_identification_number: "0".repeat(121), brand_name: "Overlong" },
    { drug_identification_number: "00000001", brand_name: "L".repeat(241) },
    { drug_identification_number: "00000002", brand_name: "Bidi" + String.fromCharCode(0x202e) },
    { drug_identification_number: "00000003" + String.fromCharCode(0x200b), brand_name: "Invisible source id" },
    { drug_identification_number: "00000004", brand_name: "C1" + String.fromCharCode(0x0085) }
  ]);
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].localId, fullId);
  assert.equal(result.records[0].label, safeLabel);
  assert.equal(result.canPublish, false);
  const bad = [
    ["us-fda-drugsfda", {results: [{application_number:"Z".repeat(121), products:[{brand_name:"F"}]}]}],
    ["global-clinicaltrials", {studies: [{protocolSection:{identificationModule:{nctId:"NCT1"+String.fromCharCode(0x202e),briefTitle:"T"}}}]}],
    ["global-europepmc", {resultList:{result:[{id:"123",title:"R"+String.fromCharCode(0x200b)}]}}],
    ["global-pubmed", {esearchresult:{idlist:["9".repeat(121)]}}],
    ["global-chembl", {molecules:[{molecule_chembl_id:"CHEMBL"+String.fromCharCode(0x2066),pref_name:"Drug"}]}],
    ["es-aemps-cima", {resultados:[{nregistro:"0007",nombre:"L".repeat(241)}]}]
  ];
  for (const [sourceId, raw] of bad) {
    const normalized = normaliseGovSourceResult(buildGovSourcePlan({sourceId,term:"Apixaban"}), raw);
    assert.deepEqual(normalized.records, [], sourceId);
    assert.equal(normalized.canPublish, false);
  }
});

test("rights clock must be a nonnegative exact epoch-millisecond integer before transport", async () => {
  let calls = 0;
  const plan = buildGovSourcePlan({sourceId:"global-clinicaltrials",term:"Apixaban"});
  for (const clock of [-1, TEST_NOW + 0.5, NaN, Infinity, undefined, "bad", Number.MAX_SAFE_INTEGER+1]) {
    assert.throws(() => assertInternalEvaluationPermit({
      permit: permit(), sourceId: plan.sourceId, tenantId:"tenant1",
      country:plan.country, domain:plan.domain, now: clock
    }), /not approved/);
    const reader = createGovSourceReader({
      authorize: async input => permit(input), now: () => clock,
      transport: async () => { calls++; throw Error("not authorized for fetch"); }
    });
    await assert.rejects(reader.read({
      sourceId: "global-clinicaltrials", term:"Apixaban", tenantId:"tenant1"
    }), /not approved/);
  }
  assert.equal(calls, 0);
});

test("an expired or invalid second clock withholds already fetched internal source records", async () => {
  const expiry = Date.parse("2026-11-17T18:00:00.000Z");
  for (const secondClock of [expiry, expiry + 1, NaN, null, TEST_NOW + 0.5, undefined]) {
    let tick = 0, network = 0;
    const reader = createGovSourceReader({
      authorize: async input => permit(input),
      now: () => (++tick === 1 ? TEST_NOW : secondClock),
      transport: async () => {
        network++;
        return new Response(JSON.stringify({
          studies: [{protocolSection:{identificationModule:{nctId:"NCT01234567",briefTitle:"Synthetic fixture"}}}]
        }), {headers:{"content-type":"application/json"}});
      }
    });
    await assert.rejects(reader.read({
      sourceId:"global-clinicaltrials",term:"Apixaban",tenantId:"tenant1"
    }), /Invalid evaluation envelope/);
    assert.equal(network, 1);
  }
});


test("all nine source gateway contracts require stable rights after transport, not only at request start", async () => {
  const payload = { studies: [{
    protocolSection: { identificationModule: {
      nctId: "NCT01234567", briefTitle: "Synthetic internal fixture"
    } }
  }] };
  const changes = [
    { revokedAt: "2026-11-17T16:30:00.000Z" },
    { rightsStatus: "not-reviewed" },
    { country: "ES" },
    { tenantId: "anotherTenant" },
    { receiptId: "receipt-test-999" },
    { licenseId: "lic-test-999" },
    { rightsVersion: "rights-v999" },
    { validUntil: "2026-11-17T17:30:00.000Z" }
  ];
  for (const modification of changes) {
    let grants = 0, outgoing = 0;
    const reader = createGovSourceReader({
      authorize: async context => permit({
        ...context, ...(++grants === 1 ? {} : modification)
      }),
      now: () => TEST_NOW,
      transport: async () => {
        outgoing++;
        return new Response(JSON.stringify(payload), {
          headers: { "content-type": "application/json" }
        });
      }
    });
    await assert.rejects(
      reader.read({sourceId:"global-clinicaltrials",term:"Apixaban",tenantId:"tenant1"}),
      /Source rights (are not approved|changed during evaluation)/,
      JSON.stringify(modification)
    );
    assert.equal(grants, 2);
    assert.equal(outgoing, 1);
  }
});

test("expanded nine-source gateway refuses a clock rollback and any source-rights outage after fetch", async () => {
  const response = () => new Response(JSON.stringify({
    studies: [{protocolSection:{identificationModule:{
      nctId:"NCT01234567",briefTitle:"Synthetic"
    }}}]
  }), {headers:{"content-type":"application/json"}});
  let calls=0;
  const reader = createGovSourceReader({
    authorize: async ctx => {calls++;return permit(ctx);},
    now: (() => {let n=0;return()=>++n===1 ? TEST_NOW : TEST_NOW-1000;})(),
    transport:async()=>response()
  });
  await assert.rejects(reader.read({
    sourceId:"global-clinicaltrials",term:"Apixaban",tenantId:"tenant1"
  }), /Invalid evaluation envelope/);
  assert.equal(calls,1,"Rollback must fail even before the second rights service call");

  const secret="SHOULD_NOT_LEAK_RIGHTS_BACKEND_CREDENTIAL";
  let count=0;
  const unavailable = createGovSourceReader({
    authorize:async ctx => {
      if(++count===1)return permit(ctx);
      throw new Error(secret);
    },
    now:()=>TEST_NOW,transport:async()=>response()
  });
  await assert.rejects(unavailable.read({
    sourceId:"global-clinicaltrials",term:"Apixaban",tenantId:"tenant1"
  }),err=>err instanceof Error && err.message==="Source rights are not approved" &&
    !err.message.includes(secret));
  assert.equal(count,2);

  assert.throws(()=>createGovSourceReader({
    authorize:async()=>permit(),
    transport:async()=>response(),
    now:"invalid clock"
  }),/Trusted authorizer and transport/);
});

test("stable double-authorisation still produces only a non-publishable evidence envelope", async () => {
  let authorizations=0;
  const reader=createGovSourceReader({
    authorize:async ctx=>{authorizations++;return permit(ctx);},
    now:()=>TEST_NOW,
    transport:async()=>new Response(JSON.stringify({
      studies:[{protocolSection:{identificationModule:{
        nctId:"NCT01234567",briefTitle:"Synthetic"
      }}}]
    }),{headers:{"content-type":"application/json"}})
  });
  const result=await reader.read({
    sourceId:"global-clinicaltrials",term:"Apixaban",tenantId:"tenant1"
  });
  assert.equal(authorizations,2);
  assert.equal(result.canPublish,false);
  assert.equal(result.rightsReceiptId,"receipt-test-001");
  assert.equal(result.publishDecision,"DENIED_UNTIL_INDEPENDENT_DATA_ADMISSION");
});


test("source grant expiry while reauthorising is blocked at the final trusted clock", async () => {
  const payload={studies:[{protocolSection:{identificationModule:{
    nctId:"NCT01234567",briefTitle:"Synthetic evaluation"
  }}}]};
  const clockCases=[
    Date.parse("2026-11-17T18:00:00.000Z"),
    TEST_NOW - 1,
    NaN,
    undefined
  ];
  for (const afterReauthorisation of clockCases) {
    let calls=0;
    const times=[TEST_NOW,TEST_NOW,afterReauthorisation];
    const reader=createGovSourceReader({
      authorize:async ctx=>{calls++;return permit(ctx);},
      now:()=>times.shift(),
      transport:async()=>new Response(JSON.stringify(payload),
        {headers:{"content-type":"application/json"}})
    });
    await assert.rejects(reader.read({
      sourceId:"global-clinicaltrials",term:"Apixaban",tenantId:"tenant1"
    }),/Invalid evaluation envelope/);
    assert.equal(calls,2,"Second rights service request was completed");
  }
});


// Reconciled regression coverage from PR #834; gateway denial is stricter on #830.
test("upstream medicine identifiers remain lossless and unsafe/oversized fields are omitted rather than truncated", () => {
  const plan = buildGovSourcePlan({ sourceId: "ca-health-canada-dpd", term: "Apixaban", limit: 5 });
  const fullId = "0".repeat(119) + "1";
  const fullLabel = "A".repeat(240);
  const data = [
    { drug_identification_number: fullId, brand_name: fullLabel },
    { drug_identification_number: "0".repeat(121), brand_name: "Invalid long ID" },
    { drug_identification_number: "00012345", brand_name: "B".repeat(241) },
    { drug_identification_number: "00012346", brand_name: "Alpha" + String.fromCharCode(0x202e) + "Beta" },
    { drug_identification_number: "00012347" + String.fromCharCode(0x200b), brand_name: "Invisible ID" }
  ];
  const result = normaliseGovSourceResult(plan, data);
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].localId, fullId);
  assert.equal(result.records[0].label, fullLabel);
  assert.equal(result.canPublish, false);
});

test("malformed upstream trial and regulator identifiers do not become plausible truncated medicine facts", () => {
  const cases = [
    ["us-fda-drugsfda", {results:[{application_number:"X".repeat(121),products:[{brand_name:"Sample"}]}]}],
    ["global-clinicaltrials", {studies:[{protocolSection:{identificationModule:{nctId:"NCT00000001" + String.fromCharCode(0x202e),briefTitle:"Study"}}}]}],
    ["es-aemps-cima", {resultados:[{nregistro:"000123",nombre:"A".repeat(241)}]}],
    ["global-europepmc", {resultList:{result:[{id:"12345678",title:"Example" + String.fromCharCode(0x200b)}]}}]
  ];
  for (const [sourceId, raw] of cases) {
    const plan = buildGovSourcePlan({sourceId,term:"Apixaban",limit:5});
    const result = normaliseGovSourceResult(plan,raw);
    assert.deepEqual(result.records, [],sourceId);
    assert.equal(result.canPublish,false,sourceId);
  }
});

test("source rights permit getters are single-read and malformed authority exceptions are masked", () => {
  const ctx = {sourceId:"global-clinicaltrials",tenantId:"tenant1",domain:"clinical-trials",country:"GLOBAL",now:TEST_NOW};
  const base=permit(ctx);
  let receiptReads=0,expiryReads=0;
  const dynamic=new Proxy(base,{get(target,key){
    if(key==="receiptId")return ++receiptReads===1?base.receiptId:"receipt-swapped";
    if(key==="validUntil")return ++expiryReads===1?base.validUntil:"2026-11-17T18:05:00.000Z";
    return Reflect.get(target,key);
  }});
  const grant=assertInternalEvaluationPermit({...ctx,permit:dynamic});
  assert.equal(grant.receiptId,base.receiptId);
  assert.equal(grant.validUntil,base.validUntil);
  assert.equal(receiptReads,1);
  assert.equal(expiryReads,1);
  const marker="SECRET_SOURCE_AUTHORITY_PRIVATE_KEY";
  const hostile=new Proxy(base,{get(target,key){if(key==="rightsStatus")throw Error(marker);return Reflect.get(target,key)}});
  assert.throws(()=>assertInternalEvaluationPermit({...ctx,permit:hostile}),
    e=>e instanceof Error&&e.message==="Source rights are not approved"&&!e.message.includes(marker));
});


test("source-rights reader redacts backend authorizer failures at both rights gates", async () => {
  const secret = "PRIVATE_RIGHTS_PROVIDER_TOKEN_MUST_NOT_LEAK";
  for (const failingCall of [1, 2]) {
    let authorizations = 0;
    let upstreamReads = 0;
    const reader = createGovSourceReader({
      authorize: async context => {
        if (++authorizations === failingCall) throw new Error(secret);
        return permit(context);
      },
      now: () => TEST_NOW,
      transport: async () => {
        upstreamReads++;
        return new Response(JSON.stringify({
          studies: [{protocolSection: {identificationModule: {
            nctId: "NCT01234567", briefTitle: "Synthetic private-data fixture"
          }}}]
        }), {headers: {"content-type": "application/json"}});
      }
    });
    await assert.rejects(
      reader.read({sourceId: "global-clinicaltrials", term: "Apixaban", tenantId: "tenant1"}),
      error => error instanceof Error &&
        error.message === "Source rights authorizer unavailable" &&
        !error.message.includes(secret)
    );
    assert.equal(authorizations, failingCall);
    assert.equal(upstreamReads, failingCall - 1);
  }
});

test("source-rights reader redacts trusted clock callback failures at both rights gates", async () => {
  const secret = "PRIVATE_CLOCK_BACKEND_CONFIGURATION_MUST_NOT_LEAK";
  for (const failingRead of [1, 2]) {
    let ticks = 0;
    let upstreamReads = 0;
    const reader = createGovSourceReader({
      authorize: async context => permit(context),
      now: () => {
        if (++ticks === failingRead) throw new Error(secret);
        return TEST_NOW;
      },
      transport: async () => {
        upstreamReads++;
        return new Response(JSON.stringify({
          studies: [{protocolSection: {identificationModule: {
            nctId: "NCT01234567", briefTitle: "Synthetic private-data fixture"
          }}}]
        }), {headers: {"content-type": "application/json"}});
      }
    });
    await assert.rejects(
      reader.read({sourceId: "global-clinicaltrials", term: "Apixaban", tenantId: "tenant1"}),
      error => error instanceof Error &&
        error.message === "Source rights trusted clock unavailable" &&
        !error.message.includes(secret)
    );
    assert.equal(ticks, failingRead);
    assert.equal(upstreamReads, failingRead - 1);
  }
});


test("source-rights reader redacts failure of final post-reauthorization server clock", async () => {
  const secret = "PRIVATE_FINAL_CLOCK_SECRET_MUST_NOT_LEAK";
  let ticks = 0, authorizations = 0, upstreamReads = 0;
  const reader = createGovSourceReader({
    authorize: async context => { authorizations++; return permit(context); },
    now: () => { if (++ticks === 3) throw new Error(secret); return TEST_NOW; },
    transport: async () => {
      upstreamReads++;
      return new Response(JSON.stringify({
        studies: [{protocolSection:{identificationModule:{
          nctId:"NCT01234567",briefTitle:"Synthetic only"
        }}}]
      }), {headers:{"content-type":"application/json"}});
    }
  });
  await assert.rejects(
    reader.read({sourceId:"global-clinicaltrials",term:"Apixaban",tenantId:"tenant1"}),
    error => error instanceof Error &&
      error.message === "Source rights trusted clock unavailable" &&
      !error.message.includes(secret)
  );
  assert.equal(ticks,3);
  assert.equal(authorizations,2);
  assert.equal(upstreamReads,1);
});
