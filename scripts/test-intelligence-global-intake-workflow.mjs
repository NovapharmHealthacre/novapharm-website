import assert from "node:assert/strict";
import {test} from "node:test";
import {createGlobalSourceIntakeEvaluator,assertGlobalIntakeCustomerReady} from "../src/core/intelligence-global-intake-workflow.mjs";

const FIXED_NOW=Date.parse("2026-11-17T19:00:00.000Z");
const metadata=Object.freeze({
  resourceId:"trial-api-sample-20261117",
  schemaVersion:"clinicaltrials-v2-json",
  observationStart:"2026-11-10",
  observationEnd:"2026-11-16",
  publishedOn:"2026-11-17"
});
const record=(title)=>Buffer.from(JSON.stringify({
  studies:[{protocolSection:{identificationModule:{nctId:"NCT00000042",briefTitle:title}}}]
}));
function permit(input,changes={}){
  return {
    decision:"approved",rightsStatus:"approved",
    tenantId:input.tenantId,sourceId:input.sourceId,country:input.country,
    domain:input.domain,purpose:"internal-evaluation",
    allowedUses:["internal-evaluation"],
    receiptId:"rights-receipt-001",
    rightsVersion:"rights-review-v1",
    licenseId:"license-internal-v1",
    issuedAt:"2026-11-17T18:00:00.000Z",
    validUntil:"2026-11-17T20:00:00.000Z",
    revokedAt:null,...changes
  };
}
const request={sourceId:"global-clinicaltrials",term:"Apixaban",limit:5,
  tenantId:"tenant-alpha",metadata,rawBytes:record("Study example")};

test("a trusted internal evaluation creates country-bound immutable quarantine and separate review evidence",async()=>{
 const evaluator=createGlobalSourceIntakeEvaluator({
   authorize:async ctx=>permit(ctx),now:()=>FIXED_NOW
 });
 const output=await evaluator.evaluate(request);
 assert.equal(output.contract,"novapharm.intelligence.global-intake-evaluation.v1");
 assert.equal(output.manifest.jurisdiction,"GLOBAL");
 assert.equal(output.manifest.datasetKey,"clinicaltrials-v2");
 assert.equal(output.manifest.sourceRightsIndependentlyApproved,false);
 assert.equal(output.manifest.productionAccepted,false);
 assert.equal(output.manifest.canPublish,false);
 assert.equal(output.evidence.canPublish,false);
 assert.equal(output.evidence.records[0].localId,"NCT00000042");
 assert.equal(output.evidence.rightsReceiptId,"rights-receipt-001");
 assert.match(output.manifest.digestSha256,/^[a-f0-9]{64}$/);
 assert.match(output.evidence.responseSha256,/^[a-f0-9]{64}$/);
 assert.ok(!JSON.stringify(output.manifest).includes("Study example"));
 assert.equal(output.admissionDecision,"DENIED_UNTIL_INDEPENDENT_RIGHTS_AND_DATA_ADMISSION");
 assert.throws(()=>assertGlobalIntakeCustomerReady(output),/rejected/);
});
test("the protected authorizer is called before reading invalid/oversized source bytes",async()=>{
 let calls=0;
 const evaluator=createGlobalSourceIntakeEvaluator({
   authorize:async ctx=>{calls++;return permit(ctx,{rightsStatus:"pending"});},
   now:()=>FIXED_NOW
 });
 await assert.rejects(evaluator.evaluate({...request,rawBytes:Buffer.alloc(300000,1)}),/not approved/);
 assert.equal(calls,1);
});
test("deny revoked, expired, cross-tenant, cross-country or wrong-purpose rights grants",async()=>{
 const changes=[
  {tenantId:"tenant-beta"},{sourceId:"us-fda-drugsfda"},
  {country:"US"},{domain:"clinical-trials-wrong"},
  {purpose:"customer-delivery"},{rightsStatus:"not-reviewed"},
  {allowedUses:["redistribution"]},{revokedAt:"2026-11-17T18:45:00Z"},
  {validUntil:"2026-11-17T18:59:00.000Z"}
 ];
 for(const change of changes){
   const evaluator=createGlobalSourceIntakeEvaluator({
     authorize:async ctx=>permit(ctx,change),now:()=>FIXED_NOW
   });
   await assert.rejects(evaluator.evaluate(request),/not approved/);
 }
});
test("source payload, schema and bounded filename/date metadata must be valid",async()=>{
 const evaluator=createGlobalSourceIntakeEvaluator({
   authorize:async ctx=>permit(ctx),now:()=>FIXED_NOW
 });
 for(const invalid of [
   {...request,rawBytes:Buffer.from("<html>blocked</html>")},
   {...request,rawBytes:Buffer.alloc(262145,1)},
   {...request,rawBytes:Buffer.from(JSON.stringify({unexpected:[]}))},
   {...request,metadata:{...metadata,schemaVersion:""}},
   {...request,metadata:{...metadata,publishedOn:"2026-11-12"}},
   {...request,metadata:{...metadata,observationStart:"2026-02-30"}}
 ])await assert.rejects(evaluator.evaluate(invalid));
 await assert.rejects(evaluator.evaluate({...request,sourceId:"evil-source"}),/Unsupported source/);
});
test("source revision detection preserves tenant isolation",async()=>{
 const evaluator=createGlobalSourceIntakeEvaluator({
   authorize:async ctx=>permit(ctx),now:()=>FIXED_NOW
 });
 const first=await evaluator.evaluate(request);
 const repeat=await evaluator.evaluate(request);
 const updated=await evaluator.evaluate({...request,rawBytes:record("Revised study description")});
 assert.equal(evaluator.compareReplay([],first).decision,"QUARANTINE_NEW_CANDIDATE");
 assert.equal(evaluator.compareReplay([first],repeat).decision,"DUPLICATE");
 assert.equal(evaluator.compareReplay([first],updated).decision,"QUARANTINE_CONFLICTING_REVISION");
 const other=await evaluator.evaluate({...request,tenantId:"tenant-beta"});
 assert.throws(()=>evaluator.compareReplay([first],other),/cross-tenant/);
 assert.throws(()=>evaluator.compareReplay([{...first,canPublish:true}],repeat),/untrusted/);
});
test("native IDs are preserved for Canadian DPD, with no country translation",async()=>{
 const evaluator=createGlobalSourceIntakeEvaluator({
   authorize:async ctx=>permit(ctx),now:()=>FIXED_NOW
 });
 const result=await evaluator.evaluate({
   tenantId:"tenant-alpha",sourceId:"ca-health-canada-dpd",term:"Apixaban",
   metadata:{...metadata,resourceId:"dpd-sample-20261117",schemaVersion:"dpd-v1"},
   rawBytes:Buffer.from(JSON.stringify([{drug_identification_number:"00001234",brand_name:"A brand"}]))
 });
 assert.equal(result.manifest.jurisdiction,"CA");
 assert.equal(result.evidence.records[0].localId,"00001234");
 assert.equal(result.canPublish,false);
});

test("offline intake suppresses trusted authorizer and clock adapter exceptions", async()=>{
  const marker="SECRET_INTERNAL_SERVICE_CONNECTION";
  const bad=async()=>{throw Error(marker);};
  const calls=[
    createGlobalSourceIntakeEvaluator({authorize:bad,now:()=>FIXED_NOW}),
    createGlobalSourceIntakeEvaluator({authorize:async c=>permit(c),now:()=>{throw Error(marker);}})
  ];
  for(const evaluator of calls){
    await assert.rejects(evaluator.evaluate(request),error=>error instanceof Error &&
      /Global source intake rejected/.test(error.message) && !error.message.includes(marker));
  }
});


test("source-intake clock is sampled after trusted backend authorization",async()=>{
 let approved=false,reads=0;
 const evaluator=createGlobalSourceIntakeEvaluator({
   authorize:async context=>{approved=true;return permit(context);},
   now:()=>{assert.equal(approved,true,"clock must follow asynchronous authorization");reads++;return FIXED_NOW;}
 });
 const result=await evaluator.evaluate(request);
 assert.equal(reads,2);
 assert.equal(result.evidence.canPublish,false);
 assert.equal(result.evidence.retrievedAt,"2026-11-17T19:00:00.000Z");
});

test("offline source intake denies expiry and regressed/invalid server clocks after authorization",async()=>{
 const expires=Date.parse("2026-11-17T20:00:00.000Z");
 for(const badClock of [expires,expires+1,FIXED_NOW-1,NaN,undefined,Infinity,null,FIXED_NOW+0.5]){
   let ticks=0;
   const evaluator=createGlobalSourceIntakeEvaluator({
     authorize:async context=>permit(context),
     now:()=>++ticks===1?FIXED_NOW:badClock
   });
   await assert.rejects(evaluator.evaluate(request),
     /Global source intake rejected: permit expired or server clock/);
   assert.equal(ticks,2);
 }
});

test("offline source intake refuses malformed initial clock before parsing upstream content",async()=>{
 for(const badClock of [-1,NaN,null,Infinity,FIXED_NOW+0.5]){
   let ticks=0;
   const evaluator=createGlobalSourceIntakeEvaluator({
     authorize:async context=>permit(context),
     now:()=>{ticks++;return badClock;}
   });
   await assert.rejects(evaluator.evaluate({...request,rawBytes:Buffer.from("<raw untrusted>")}),
     /Global source intake rejected: server clock/);
   assert.equal(ticks,1);
 }
});
