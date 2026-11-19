import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { evaluatePbsScheduleCsv } from "../src/core/intelligence-au-pbs-schedule-csv-quarantine.mjs";
import { createPbsScheduleCandidateEvaluator } from "../src/core/intelligence-au-pbs-schedule-quarantine.mjs";

const HEAD = "schedule_code,effective_date,revision_number,publication_status,effective_month,effective_year";
const csv = (rows, header = HEAD) =>
  new TextEncoder().encode([header,...rows].join("\r\n")+"\r\n");
const ONE = "0003922,1/10/2026,2,Published,OCTOBER,2026";
const TWO = "0003923,2026-11-01,1,Published,NOVEMBER,2026";
const NOW = Date.parse("2026-11-18T08:00:00.000Z");
const grant = (ctx, overrides={}) => ({
  decision:"approved", rightsStatus:"approved", ...ctx,
  allowedUses:["internal-evaluation"], receiptId:"synthetic-test-receipt",
  licenseId:"synthetic-test-licence",rightsVersion:"v1",
  issuedAt:"2026-11-18T07:00:00.000Z",validUntil:"2026-11-18T09:00:00.000Z",
  revokedAt:null,...overrides
});

test("official-named PBS CSV fields and revision preserve exact leading-zero schedule codes",()=>{
  const result=evaluatePbsScheduleCsv(csv([TWO,ONE]));
  assert.equal(result.distinctScheduleCount,2);
  assert.equal(result.previews[0].scheduleCode,"0003922");
  assert.equal(result.previews[0].effectiveDate,"2026-10-01");
  assert.equal(result.previews[1].scheduleCode,"0003923");
  assert.deepEqual(result.scheduleRevisionNumbers,["1","2"]);
  assert.equal(result.sampleFormat,"text/csv");
  assert.equal(result.actualPublisherCsvSampleVerified,false);
  assert.equal(result.canPublish,false);
  assert.equal(result.productionAccepted,false);
});

test("PBS CSV header field order may differ but names and source status cannot",()=>{
  const head="publication_status,revision_number,effective_date,schedule_code";
  const result=evaluatePbsScheduleCsv(csv(["Published,2,01/10/2026,0003922"],head));
  assert.equal(result.previews[0].scheduleCode,"0003922");
  assert.equal(result.previews[0].effectiveDate,"2026-10-01");
  assert.deepEqual(result.scheduleRevisionNumbers,["2"]);
});

test("PBS CSV quotation of fields is strict and does not permit hidden data substitution",()=>{
  const head="schedule_code,effective_date,revision_number,publication_status";
  const cases=[
    "0003922,01/10/2026,1,Embargo",
    "0003922,01/10/2026,1,Embargo (Superseded)",
    "0003922,01/10/2026,1,Draft",
    "0003922,01/10/2026,1,Published,extra",
    "0003922,31/02/2026,1,Published",
    "0003922,01/10/2026,no,Published",
    '"0003922"x,01/10/2026,1,Published',
    "0003922,01/10/2026,1,Pub\u202elished",
    "0003922,01/10/2026,1,Published\n0003922,01/10/2026,1,Published"
  ];
  for(const row of cases)assert.throws(()=>evaluatePbsScheduleCsv(csv([row],head)),/PBS schedule CSV quarantine rejected/);
});

test("PBS CSV rejects duplicate or missing mandatory columns and malformed encodings",()=>{
  const bad=[
    csv([ONE],"schedule_code,effective_date,revision_number,revision_number,effective_year,effective_month"),
    csv([ONE],"schedule_code,effective_date,revision_number,effective_year,effective_month"),
    csv([ONE],"__proto__,effective_date,revision_number,publication_status,effective_month,effective_year"),
    csv([]),
    csv([ONE.replace("0003922","0003922\"")]),
    new Uint8Array([0xff,0xfe]),
    new Uint8Array(512*1024+1)
  ];
  for (const bytes of bad)assert.throws(()=>evaluatePbsScheduleCsv(bytes),/PBS schedule CSV quarantine rejected/);
});

test("PBS CSV is evaluated only under two trusted authorisations and remains quarantined",async()=>{
  const sourceBytes=csv([ONE]);
  let calls=0;
  const evaluator=createPbsScheduleCandidateEvaluator({
    authorize:async (ctx)=>(calls++,grant(ctx)),
    now:()=>NOW
  });
  const result=await evaluator.evaluate({
    tenantId:"tenantA",format:"text/csv",bytes:sourceBytes
  });
  assert.equal(calls,2);
  assert.equal(result.sourceFileSha256,createHash("sha256").update(sourceBytes).digest("hex"));
  assert.equal(result.sampleFormat,"text/csv");
  assert.equal(result.canPublish,false);
  assert.equal(result.sourceRightsIndependentlyApproved,false);
  assert.equal(result.distributedPublisherRateLeaseObtained,false);
  await assert.rejects(evaluator.evaluate({
    tenantId:"tenantA",format:"text/html",bytes:sourceBytes
  }),/unknown source media type/);
});

test("PBS rights revoked after reading CSV prevent preview",async()=>{
  const sourceBytes=csv([ONE]);let calls=0;
  const evaluator=createPbsScheduleCandidateEvaluator({
    authorize:async(ctx)=>++calls===1 ? grant(ctx) : grant(ctx,{rightsVersion:"v2"}),
    now:()=>NOW
  });
  await assert.rejects(evaluator.evaluate({
    tenantId:"tenantA",format:"text/csv",bytes:sourceBytes
  }),/source rights changed after parse/);
  assert.equal(calls,2);
});
