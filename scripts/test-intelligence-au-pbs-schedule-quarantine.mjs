import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  evaluatePbsScheduleJson, createPbsScheduleCandidateEvaluator,
  AU_PBS_SOURCE_ID, AU_PBS_DISTRIBUTED_INTERVAL_MS
} from "../src/core/intelligence-au-pbs-schedule-quarantine.mjs";

const NOW = Date.parse("2026-11-18T08:00:00.000Z");
const sample = (overrides = {}) => ({
  schedule_code: "0003922", effective_date: "1/10/2026",
  publication_status: "Published", ...overrides
});
const bytes = (records = [sample()]) =>
  new TextEncoder().encode(JSON.stringify({ data: records }));
const permit = (args, extras = {}) => ({
  decision: "approved", rightsStatus: "approved",
  ...args, allowedUses: ["internal-evaluation"],
  receiptId: "pbs-synthetic-receipt",
  licenseId: "pbs-synthetic-licence",
  rightsVersion: "rights-v1",
  issuedAt: "2026-11-18T07:00:00.000Z",
  validUntil: "2026-11-18T09:00:00.000Z",
  revokedAt: null, ...extras
});

test("Australia PBS is mapped to its real source-candidate registry and a non-live schedule domain", () => {
  const registry = JSON.parse(readFileSync(
    new URL("../docs/intelligence/global-pharma-sources-20261117.json", import.meta.url), "utf8"
  ));
  assert.ok(registry.sources.some(x =>
    x.country === "Australia" && x.provider === "PBS" &&
    x.rightsStatus === "not-reviewed" &&
    x.integrationStatus === "candidate-only" &&
    x.dataAdmission === "not-admitted"
  ));
  assert.equal(AU_PBS_SOURCE_ID, "au-pbs-schedules");
  assert.equal(AU_PBS_DISTRIBUTED_INTERVAL_MS, 20000);
});

test("PBS snapshot parser preserves exact native schedule codes and dates without claiming stock", () => {
  const result = evaluatePbsScheduleJson(bytes([
    sample({schedule_code:"00003922",effective_date:"1/10/2026"}),
    sample({schedule_code:"3923",effective_date:"2026-11-01"})
  ]));
  assert.equal(result.distinctScheduleCount, 2);
  assert.equal(result.previews[0].scheduleCode, "00003922");
  assert.equal(result.previews[0].effectiveDate, "2026-10-01");
  assert.equal(result.previews[0].sourceEffectiveDate, "1/10/2026");
  assert.equal(result.previews[1].scheduleCode, "3923");
  assert.equal(result.previews[1].effectiveDate, "2026-11-01");
  assert.equal(result.schedulesAreNotInventory, true);
  assert.equal(result.liveRetailOrInventoryDataPresent, false);
  assert.equal(result.sourceSchemaConfirmedAgainstLivePublisher, false);
  assert.equal(result.completePbsDatasetObtained, false);
  assert.equal(result.canPublish, false);
  assert.ok(Object.isFrozen(result.previews));
});

test("no fabricated sample can claim a current approved or unembargoed source", () => {
  for (const item of [
    sample({publication_status:"Embargo"}),
    sample({publication_status:"Embargo (Superseded)"}),
    sample({publication_status:"Draft"}),
    sample({publication_status:null}),
    sample({effective_date:"31/02/2026"}),
    sample({effective_date:"2026-13-01"}),
    sample({effective_date:"2030-01-99"}),
    sample({schedule_code:"a/b"}),
    sample({schedule_code:NaN}),
    sample({schedule_code:3923}),
    sample({schedule_code:"\u202e3299"})
  ]) assert.throws(() => evaluatePbsScheduleJson(bytes([item])), /PBS schedule quarantine rejected/);
});

test("malformed, oversized and duplicate source bytes cannot be evaluated", () => {
  const cases = [
    new Uint8Array(),
    new Uint8Array([0xff, 0xfe, 0xfd]),
    new Uint8Array(512*1024 + 1),
    new TextEncoder().encode("<html>not JSON</html>"),
    new TextEncoder().encode('{"results":[]}'),
    bytes([]),
    bytes([sample(), sample()]),
    bytes(Array.from({length: 1001}, (_,i) => sample({schedule_code:String(i)}))),
    bytes([null]),
    bytes([{schedule_code:"3922"}])
  ];
  for (const input of cases) {
    assert.throws(() => evaluatePbsScheduleJson(input), /PBS schedule quarantine rejected/);
  }
});

test("one rights-gated offline parse produces integrity and denial fields only", async () => {
  const input=bytes();
  const e=createPbsScheduleCandidateEvaluator({
    authorize: async (ctx) => permit(ctx),
    now: () => NOW
  });
  const result=await e.evaluate({tenantId:"tenantA",bytes:input});
  assert.equal(result.sourceFileSha256, createHash("sha256").update(input).digest("hex"));
  assert.equal(result.rightsReceiptId,"pbs-synthetic-receipt");
  assert.equal(result.sharedPublicApiRateLimitMs,20000);
  for(const key of [
    "sourceRightsIndependentlyApproved", "sourcePublicationDateVerified",
    "distributedPublisherRateLeaseObtained", "rightsToRedistributeVerified",
    "realSourceSnapshotVerified","nativeAustralianMedicineIdentifiersReconciled",
    "productionAccepted","canPublish","commercialDecisionReady",
    "clinicalDecisionReady","publicCustomerEndpointConnected"
  ]) assert.equal(result[key],false,key);
});

test("unapproved, expired or cross-tenant permissions fail before parsing", async () => {
  for(const auth of [
    async () => ({decision:"approved"}),
    async (ctx) => permit(ctx,{country:"GB"}),
    async (ctx) => permit(ctx,{tenantId:"otherTenant"}),
    async (ctx) => permit(ctx,{purpose:"customer-delivery"}),
    async (ctx) => permit(ctx,{validUntil:"2026-11-18T07:59:59.000Z"}),
    async (ctx) => permit(ctx,{revokedAt:"2026-11-18T07:00:00.000Z"})
  ]){
    let count=0;
    const reader=createPbsScheduleCandidateEvaluator({
      authorize: async (ctx) => {count++;return auth(ctx)},
      now:()=>NOW
    });
    await assert.rejects(reader.evaluate({tenantId:"tenantA",bytes:bytes()}),/not approved/);
    assert.equal(count,1);
  }
});

test("rights revocation, lease rotation and backend outage after parser deny preview", async () => {
  for(const later of [
    (ctx)=>permit(ctx,{revokedAt:"2026-11-18T07:30:00.000Z"}),
    (ctx)=>permit(ctx,{rightsVersion:"rights-v2"}),
    (ctx)=>permit(ctx,{licenseId:"another-licence"}),
    (ctx)=>permit(ctx,{receiptId:"another-receipt"}),
    (ctx)=>permit(ctx,{tenantId:"someoneElse"}),
    ()=>{throw new Error("authorization service unavailable");}
  ]){
    let auth=0;
    const evaluator=createPbsScheduleCandidateEvaluator({
      authorize: async (ctx) => (++auth===1 ? permit(ctx) : later(ctx)),
      now:()=>NOW
    });
    await assert.rejects(evaluator.evaluate({tenantId:"tenantA",bytes:bytes()}),
      /PBS schedule quarantine rejected: source rights (revoked|changed|unavailable) after parse/);
    assert.equal(auth,2);
  }
});

test("clock rollbacks, expiry and missing authenticated context fail closed", async () => {
  assert.throws(()=>createPbsScheduleCandidateEvaluator(),/trusted server/);
  const b=bytes();
  for(const now of [
    ()=>NaN, ()=>Infinity, ()=>-1
  ]){
    const e=createPbsScheduleCandidateEvaluator({
      authorize:async ctx=>permit(ctx),now
    });
    await assert.rejects(e.evaluate({tenantId:"tenantA",bytes:b}),/invalid trusted/);
  }
  const broken=createPbsScheduleCandidateEvaluator({
    authorize:async ctx=>permit(ctx),now:()=>NOW
  });
  await assert.rejects(broken.evaluate({tenantId:"X",bytes:b}),/tenant identity/);
  const clocks=[NOW,Date.parse("2026-11-18T09:00:00.000Z")];
  const expired=createPbsScheduleCandidateEvaluator({
    authorize:async ctx=>permit(ctx),now:()=>clocks.shift()
  });
  await assert.rejects(expired.evaluate({tenantId:"tenantA",bytes:b}),/expired during parse/);
});


test("future-dated public PBS schedules fail even if untrusted source labels them Published", async () => {
  const future = bytes([sample({
    schedule_code: "00043922",
    effective_date: "2099-01-01",
    publication_status: "Published"
  })]);
  let authCalls = 0;
  const evaluator = createPbsScheduleCandidateEvaluator({
    authorize: async ctx => { authCalls++; return permit(ctx); },
    now: () => NOW
  });
  await assert.rejects(
    evaluator.evaluate({tenantId:"tenantA", bytes:future}),
    /future or embargoed public schedule/
  );
  assert.equal(authCalls, 1, "Never return embargoed data even if first grant is valid");
});


test("trusted authorizer and clock errors are masked at every PBS evaluation stage", async () => {
  const secret = "SECRET_INTERNAL_AUTHORISATION_CREDENTIAL";
  let clocks = 0;
  const noRights = createPbsScheduleCandidateEvaluator({
    authorize: async () => { throw Error(secret); },
    now: () => { clocks++; return NOW; }
  });
  await assert.rejects(noRights.evaluate({tenantId:"tenantA",bytes:bytes()}), err =>
    err.message === "PBS schedule quarantine rejected: source rights unavailable before parse" &&
    !err.message.includes(secret));
  assert.equal(clocks, 0, "No clock or parsing follows failed initial authorisation");

  for (let failAt = 1; failAt <= 3; failAt++) {
    let ticks = 0, rightsCalls = 0;
    const evaluator = createPbsScheduleCandidateEvaluator({
      authorize: async ctx => { rightsCalls++; return permit(ctx); },
      now: () => {
        if (++ticks === failAt) throw Error(secret);
        return NOW;
      }
    });
    await assert.rejects(evaluator.evaluate({tenantId:"tenantA",bytes:bytes()}), err =>
      err.message === "PBS schedule quarantine rejected: invalid trusted server time" &&
      !err.message.includes(secret));
    assert.equal(rightsCalls, failAt === 3 ? 2 : 1);
  }
});

test("server timestamps exceeding JavaScript Date range are rejected before calendar conversion", async () => {
  for (let failAt = 1; failAt <= 3; failAt++) {
    let tick = 0;
    const evaluator = createPbsScheduleCandidateEvaluator({
      authorize: async ctx => permit(ctx),
      now: () => (++tick === failAt ? Number.MAX_SAFE_INTEGER : NOW)
    });
    await assert.rejects(evaluator.evaluate({tenantId:"tenantA",bytes:bytes()}),
      /PBS schedule quarantine rejected: invalid trusted server time/);
  }
});
