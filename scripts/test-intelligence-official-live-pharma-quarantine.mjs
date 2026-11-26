import assert from "node:assert/strict";
import test from "node:test";
import {
  createOfficialLivePharmaQuarantineReader,
  OFFICIAL_LIVE_PROBE_PLANS
} from "../src/core/intelligence-official-live-pharma-probes.mjs";

const NOW=Date.parse("2026-11-18T09:00:00.000Z");
const JSON_RESPONSE=x=>new Response(JSON.stringify(x),{
  headers:{"content-type":"application/json"}
});
const payload = sourceId => sourceId==="us-fda-drugsfda" ? {
  meta:{last_updated:"2026-08-07",results:{total:29260}},
  results:[{application_number:"ANDA076829",
    products:[{brand_name:"AMMONIUM LACTATE"}]}]
} : {
  success:true,
  result:{
    resource_id:"d_767279312753558cbf19d48344577084",
    fields:[{id:"LicenceNo"},{id:"Productname"}],
    records:[{LicenceNo:"SIN00230P",
      Productname:"CHLORAMPHENICOL EAR DROPS"}]
  }
};
const metadata=sourceId=>{
  const source=OFFICIAL_LIVE_PROBE_PLANS[sourceId];
  return {
    datasetKey:source.datasetKey,
    resourceId:source.releaseResourceId,
    schemaVersion:"publisher-schema-candidate-v1",
    observationStart:"2026-08-07",
    observationEnd:"2026-08-07",
    publishedOn:"2026-08-07"
  };
};
const grant=(ctx,other={})=>({
  ...ctx,decision:"approved",rightsStatus:"approved",
  allowedUses:["internal-evaluation"],
  receiptId:"trusted-synthetic-receipt-001",
  licenseId:"synthetic-internal-license",
  rightsVersion:"v1",issuedAt:"2026-11-18T08:00:00.000Z",
  validUntil:"2026-11-18T10:00:00.000Z",revokedAt:null,
  ...other
});
const reader=overrides=>createOfficialLivePharmaQuarantineReader({
  authorize:async context=>grant(context),
  releaseInventory:async({sourceId})=>metadata(sourceId),
  transport:async url=>JSON_RESPONSE(payload(
    url.startsWith("https://api.fda.gov/")?"us-fda-drugsfda":"sg-hsa-registered-products"
  )),
  now:()=>NOW,...overrides
});

test("FDA and HSA real-public-API-shaped samples pass into noncustomer internal snapshot quarantine",async()=>{
  for(const sourceId of Object.keys(OFFICIAL_LIVE_PROBE_PLANS)){
    let rights=0,provider=0,fetches=0;
    const evalr=reader({
      authorize:async ctx=>{rights++;return grant(ctx)},
      releaseInventory:async context=>{provider++;return metadata(context.sourceId)},
      transport:async(url,opts)=>{
        fetches++;
        assert.equal(opts.method,"GET");
        assert.equal(opts.redirect,"error");
        assert.equal(opts.credentials,"omit");
        assert.equal(opts.cache,"no-store");
        assert.equal(url,OFFICIAL_LIVE_PROBE_PLANS[sourceId].url);
        return JSON_RESPONSE(payload(sourceId));
      }
    });
    const result=await evalr.evaluate({sourceId,tenantId:"tenantA"});
    assert.equal(rights,2);
    assert.equal(provider,1);
    assert.equal(fetches,1);
    assert.equal(result.publisherApiResponded,true);
    assert.equal(result.sourceSnapshotQuarantined,true);
    assert.equal(result.sourceRecordsSchemaValidated,1);
    assert.equal(result.manifest.contract,"novapharm.intelligence.source-quarantine.v1");
    assert.equal(result.manifest.sourceKey,sourceId);
    assert.equal(result.manifest.intakeState,"QUARANTINED_INTERNAL_EVALUATION");
    assert.match(result.manifest.digestSha256,/^[0-9a-f]{64}$/);
    assert.match(result.manifest.snapshotId,/^[0-9a-f]{64}$/);
    assert.equal(result.sourceResponseSha256,result.manifest.digestSha256);
    assert.equal(result.independentSourceUseRightsLegallyVerified,false);
    assert.equal(result.customerReadEnabled,false);
    assert.equal(result.productionAccepted,false);
    assert.equal(result.canPublish,false);
    assert.equal(result.rawRecordsRetained,false);
    const serialized=JSON.stringify(result);
    for(const forbidden of ["ANDA076829","SIN00230P",
      "AMMONIUM LACTATE","CHLORAMPHENICOL EAR DROPS"]){
      assert.ok(!serialized.includes(forbidden),forbidden);
    }
    assert.ok(Object.isFrozen(result));
    assert.ok(Object.isFrozen(result.manifest));
  }
});

test("missing independent authoriser, metadata catalogue and tenant context prohibit network calls",async()=>{
  assert.throws(()=>createOfficialLivePharmaQuarantineReader(),/trusted backend authorizer/);
  const invalid=[
    {sourceId:"other-source",tenantId:"tenantA"},
    {sourceId:"__proto__",tenantId:"tenantA"},
    {sourceId:"us-fda-drugsfda",tenantId:""},
    {sourceId:"us-fda-drugsfda",tenantId:"customer/123"}
  ];
  let network=0;
  const evalr=reader({transport:async()=>{network++;throw new Error("not called")}});
  for(const input of invalid){
    await assert.rejects(evalr.evaluate(input),/Official live source probe rejected:/);
  }
  assert.equal(network,0);
  for(const altered of [
    {decision:"denied"},
    {rightsStatus:"not-reviewed"},
    {tenantId:"anotherTenant"},
    {country:"CA"},
    {domain:"regulatory"},
    {allowedUses:["customer-publication"]},
    {revokedAt:"2026-11-18T08:30:00.000Z"},
    {validUntil:"2026-11-18T08:59:59.000Z"}
  ]){
    let fetches=0;
    const gated=reader({
      authorize:async ctx=>grant(ctx,altered),
      transport:async()=>{fetches++;throw new Error("forbidden network")}
    });
    await assert.rejects(gated.evaluate({
      sourceId:"us-fda-drugsfda",tenantId:"tenantA"
    }),/source rights not approved for internal evaluation/);
    assert.equal(fetches,0);
  }
});

test("unverified release metadata cannot create a quarantined source snapshot",async()=>{
  for(const updated of [
    {resourceId:"wrong-publisher-dataset"},
    {datasetKey:"another-drug-catalogue"},
    {schemaVersion:null},
    {publishedOn:"2030-01-01"},
    {observationEnd:"2030-01-01"},
    {observationStart:"2026-08-08"},
    {schemaVersion:"bad/path"},
    {publishedOn:"2026-08-08",observationEnd:"2026-08-08"}
  ]){
    let calls=0;
    const instance=reader({
      authorize:async ctx=>{calls++;return grant(ctx)},
      releaseInventory:async({sourceId})=>({...metadata(sourceId),...updated})
    });
    await assert.rejects(instance.evaluate({
      sourceId:"us-fda-drugsfda",tenantId:"tenantA"
    }),/(publisher release metadata|official FDA dataset revision)/);
    assert.equal(calls,1,"Invalid metadata cannot reach the final rights decision");
  }
});

test("a revoked or changed source-rights grant after reading never admits a snapshot",async()=>{
  for(const changed of [
    {decision:"denied"},
    {rightsStatus:"not-reviewed"},
    {tenantId:"anotherTenant"},
    {country:"CA"},
    {receiptId:"untrusted-later-receipt"},
    {licenseId:"changed-license"},
    {rightsVersion:"v2"},
    {validUntil:"2026-11-18T09:30:00.000Z"},
    {revokedAt:"2026-11-18T09:00:00.000Z"}
  ]){
    let calls=0;
    const instance=reader({
      authorize:async ctx=>(++calls===1?grant(ctx):grant(ctx,changed))
    });
    await assert.rejects(instance.evaluate({
      sourceId:"us-fda-drugsfda",tenantId:"tenantA"
    }),/source rights (revoked|changed) after quarantine/);
    assert.equal(calls,2);
  }
  let authorizations=0;
  const serviceDown=reader({
    authorize:async ctx=>{
      if(++authorizations===1)return grant(ctx);
      throw new Error("PRIVATE_RIGHTS_TOKEN");
    }
  });
  await assert.rejects(serviceDown.evaluate({
    sourceId:"us-fda-drugsfda",tenantId:"tenantA"
  }),error=>error.message==="Official live source probe rejected: source rights unavailable after quarantine" &&
    !error.message.includes("PRIVATE_RIGHTS_TOKEN"));
});

test("quarantine does not accept expired clocks or rollback during network and rights review",async()=>{
  const cases=[
    [NOW,NOW,NOW-1000,NOW,NOW],
    [NOW,NOW,NOW,NOW-1000,NOW],
    [NOW,NOW,NOW,NOW,NOW-1000],
    [NOW,NOW,Date.parse("2026-11-18T10:00:00.000Z"),NOW,NOW],
    [NOW,NOW,NOW,NOW,Date.parse("2026-11-18T10:00:00.000Z")],
    [NOW,NaN,NOW,NOW,NOW]
  ];
  for(const values of cases){
    const stamps=[...values];
    const instance=reader({now:()=>stamps.shift()});
    await assert.rejects(instance.evaluate({
      sourceId:"us-fda-drugsfda",tenantId:"tenantA"
    }),/Official live source probe rejected:/);
  }
});


test("FDA publisher-declared last_updated date must exactly bind the trusted release snapshot",async()=>{
  let authorizations=0;
  const original=payload("us-fda-drugsfda");
  const changed={...original,meta:{...original.meta,last_updated:"2026-08-08"}};
  const evaluator=reader({
    authorize:async ctx=>{authorizations++;return grant(ctx);},
    transport:async()=>JSON_RESPONSE(changed)
  });
  await assert.rejects(evaluator.evaluate({
    sourceId:"us-fda-drugsfda",tenantId:"tenantA"
  }),/official FDA dataset revision differs from release inventory/);
  assert.equal(authorizations,1);
  for(const date of ["tomorrow","2026-02-30","2026-8-7","2030-00-01","2026-08-07\u202e"]){
    const bad={...original,meta:{...original.meta,last_updated:date}};
    await assert.rejects(reader({
      transport:async()=>JSON_RESPONSE(bad)
    }).evaluate({
      sourceId:"us-fda-drugsfda",tenantId:"tenantA"
    }),/US FDA application response schema mismatch/);
  }
});


test("two live-source releases compare replay without cross-tenant or cross-source publication",async()=>{
  const sourceId="sg-hsa-registered-products";
  const values=[
    payload(sourceId),
    payload(sourceId),
    {...payload(sourceId),result:{...payload(sourceId).result,
      records:[{LicenceNo:"SIN00230P",Productname:"REVISED PRODUCT LABEL"}]}}
  ];
  const receipts=[];
  for(const data of values){
    const candidate=reader({
      transport:async()=>JSON_RESPONSE(data)
    });
    receipts.push(await candidate.evaluate({sourceId,tenantId:"tenantA"}));
  }
  const comparator=reader();
  const first=comparator.compareReplay([],receipts[0]);
  const duplicate=comparator.compareReplay([receipts[0]],receipts[1]);
  const changed=comparator.compareReplay([receipts[0]],receipts[2]);
  assert.equal(first.decision,"QUARANTINE_NEW_CANDIDATE");
  assert.equal(duplicate.decision,"DUPLICATE");
  assert.equal(changed.decision,"QUARANTINE_CONFLICTING_REVISION");
  for(const v of [first,duplicate,changed]){
    assert.equal(v.canPublish,false);
    assert.equal(v.productionAccepted,false);
    assert.equal(v.sourceRightsLegallyApproved,false);
    assert.equal(v.tenantId,"tenantA");
  }
  const moved={...receipts[0],tenantId:"anotherTenant"};
  assert.throws(()=>comparator.compareReplay([moved],receipts[1]),
    /cross-tenant source replay/);
  const wrongSource={...receipts[0],sourceId:"us-fda-drugsfda"};
  assert.throws(()=>comparator.compareReplay([wrongSource],receipts[1]),
    /cross-tenant source replay/);
  const forcedLive={...receipts[0],productionAccepted:true};
  assert.throws(()=>comparator.compareReplay([forcedLive],receipts[1]),
    /cross-tenant source replay/);
  assert.throws(()=>comparator.compareReplay([receipts[0]],{
    ...receipts[1],canPublish:true
  }),/cross-tenant source replay/);
});
