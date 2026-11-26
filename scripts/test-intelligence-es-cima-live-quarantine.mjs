import test from "node:test";
import assert from "node:assert/strict";
import {createCimaLiveSourceQuarantineReader,ES_CIMA_PROBE} from
  "../src/core/intelligence-es-cima-public-live-probe.mjs";

const NOW=Date.parse("2026-11-18T11:00:00.000Z");
const source=()=>({
  nregistro:"51347",nombre:"SYNTHETIC ASPIRIN MEDICINE",
  comerc:true,receta:false,
  principiosActivos:[{nombre:"SYNTHETIC INGREDIENT"}],
  presentaciones:[{cn:"712729",nombre:"SYNTHETIC PACK"}]
});
const metadata=()=>({
  datasetKey:"es-cima-medicine-detail",
  resourceId:"es-cima-nregistro-51347",
  officialRegistrationNumber:"51347",
  schemaVersion:"cima-candidate-v1",
  observationStart:"2026-11-17",
  observationEnd:"2026-11-17",
  publishedOn:"2026-11-17"
});
const grant=(ctx,changed={})=>({
  ...ctx,decision:"approved",rightsStatus:"approved",
  allowedUses:["internal-evaluation"],
  issuedAt:"2026-11-18T10:00:00.000Z",
  validUntil:"2026-11-18T12:00:00.000Z",
  receiptId:"es-cima-synthetic-rights-receipt",
  licenseId:"es-cima-synthetic-licence",
  rightsVersion:"v1",
  revokedAt:null,...changed
});
const make=(options={})=>createCimaLiveSourceQuarantineReader({
  authorize:async ctx=>grant(ctx),
  releaseInventory:async()=>metadata(),
  transport:async()=>new Response(JSON.stringify(source()),{
    headers:{"content-type":"application/json"}
  }),
  now:()=>NOW,
  ...options
});

test("Spanish medicine bytes enter only versioned tenant-scoped quarantine with two rights checks",async()=>{
  let rights=0,catalogue=0,fetches=0;
  const reader=make({
    authorize:async ctx=>{rights++;return grant(ctx);},
    releaseInventory:async data=>{
      catalogue++;
      assert.deepEqual(data,{
        sourceId:"es-aemps-cima",
        country:"ES",
        officialRegistrationNumber:"51347"
      });
      return metadata();
    },
    transport:async(url,opts)=>{
      fetches++;
      assert.equal(url,ES_CIMA_PROBE.url);
      assert.equal(opts.method,"GET");
      assert.equal(opts.credentials,"omit");
      assert.equal(opts.redirect,"error");
      return new Response(JSON.stringify(source()),{
        headers:{"content-type":"application/json"}
      });
    }
  });
  const receipt=await reader.evaluate({tenantId:"tenantA"});
  assert.equal(rights,2);
  assert.equal(catalogue,1);
  assert.equal(fetches,1);
  assert.equal(receipt.sourceSchemaBoundRecords,1);
  assert.equal(receipt.manifest.contract,"novapharm.intelligence.source-quarantine.v1");
  assert.equal(receipt.manifest.jurisdiction,"ES");
  assert.equal(receipt.manifest.sourceKey,ES_CIMA_PROBE.sourceId);
  assert.equal(receipt.manifest.intakeState,"QUARANTINED_INTERNAL_EVALUATION");
  assert.equal(receipt.sourceResponseSha256,receipt.manifest.digestSha256);
  assert.match(receipt.manifest.snapshotId,/^[0-9a-f]{64}$/);
  for(const name of [
    "publisherReleaseDatesIndependentlyVerified",
    "legalCommercialAndAiUseRightsVerified","countryMedicineIdentifiersReconciled",
    "protectedCustomerDeploymentVerified","productionAccepted",
    "customerReadEnabled","canPublish","rawMedicineRecordsRetained"
  ])assert.equal(receipt[name],false,name);
  const serialized=JSON.stringify(receipt);
  for(const sensitive of ["SYNTHETIC ASPIRIN MEDICINE",
    "SYNTHETIC INGREDIENT","SYNTHETIC PACK","712729"]){
    assert.ok(!serialized.includes(sensitive),sensitive);
  }
  assert.ok(Object.isFrozen(receipt));
  assert.ok(Object.isFrozen(receipt.manifest));
});

test("invalid tenant, backend dependency and source grants fail before publisher transport",async()=>{
  assert.throws(()=>createCimaLiveSourceQuarantineReader(),/rights authorizer/);
  let fetches=0;
  const reader=make({transport:async()=>{
    fetches++;throw new Error("no request allowed");
  }});
  for(const tenantId of ["",undefined,"a","../tenant","tenant\u202eother"]){
    await assert.rejects(reader.evaluate({tenantId}),/invalid protected tenant/);
  }
  assert.equal(fetches,0);
  for(const modification of [
    {decision:"denied"},{rightsStatus:"not-reviewed"},
    {tenantId:"anotherTenant"},{country:"GB"},
    {sourceId:"not-cima"},{domain:"sales"},{purpose:"customer-display"},
    {allowedUses:["customer-display"]},
    {revokedAt:"2026-11-18T10:30:00.000Z"},
    {validUntil:"2026-11-18T10:59:59.000Z"}
  ]){
    let requests=0;
    const denied=make({
      authorize:async ctx=>grant(ctx,modification),
      transport:async()=>{requests++;throw new Error("must not fetch")}
    });
    await assert.rejects(denied.evaluate({tenantId:"tenantA"}),
      /trusted source rights not approved/);
    assert.equal(requests,0);
  }
});

test("independent release identity, chronology and publisher error cannot admit Spanish medicine bytes",async()=>{
  for(const change of [
    {datasetKey:"another-medicines-catalogue"},
    {resourceId:"another-medicine"},
    {officialRegistrationNumber:"99999"},
    {schemaVersion:null},
    {publishedOn:"2099-01-01"},
    {observationStart:"2026-11-18",observationEnd:"2026-11-17"}
  ]){
    let grants=0;
    const reader=make({
      authorize:async ctx=>{grants++;return grant(ctx);},
      releaseInventory:async()=>({...metadata(),...change})
    });
    await assert.rejects(reader.evaluate({tenantId:"tenantA"}),
      /publisher release catalogue identity mismatch|publisher release evidence failed snapshot quarantine/);
    assert.equal(grants,1,"Cannot get final release permission for untrusted data");
  }
  const failCatalog=make({releaseInventory:async()=>{
    throw new Error("PRIVATE_CATALOGUE_PASSWORD");
  }});
  await assert.rejects(failCatalog.evaluate({tenantId:"tenantA"}),
    err=>err.message==="CIMA public source observation denied: trusted publisher release catalogue unavailable" &&
      !err.message.includes("PASSWORD"));
});

test("post-fetch revocation, rights version rotation, expiry and outages fail closed",async()=>{
  for(const change of [
    {decision:"denied"},{rightsStatus:"not-reviewed"},
    {receiptId:"another-receipt"},{licenseId:"another-license"},
    {rightsVersion:"v2"},{validUntil:"2026-11-18T11:30:00.000Z"},
    {tenantId:"foreignTenant"},
    {revokedAt:"2026-11-18T11:00:00.000Z"}
  ]){
    let calls=0;
    const r=make({
      authorize:async ctx=>++calls===1?grant(ctx):grant(ctx,change)
    });
    await assert.rejects(r.evaluate({tenantId:"tenantA"}),
      /trusted source rights not approved|source rights changed during quarantine/);
    assert.equal(calls,2);
  }
  let calls=0;
  const r=make({
    authorize:async ctx=>{
      if(++calls===1)return grant(ctx);
      throw new Error("PRIVATE_CLIENT_SECRET");
    }
  });
  await assert.rejects(r.evaluate({tenantId:"tenantA"}),
    err=>err.message==="CIMA public source observation denied: trusted source rights unavailable after quarantine" &&
      !err.message.includes("PRIVATE_CLIENT_SECRET"));
});

test("trusted source clock must not roll back or cross rights expiry during live read",async()=>{
  for(const timeline of [
    [NOW,NOW-1,NOW,NOW,NOW],
    [NOW,NOW,NOW-1,NOW,NOW],
    [NOW,NOW,NOW,NOW-1,NOW],
    [NOW,NOW,NOW,NOW,NOW-1],
    [NOW,NOW,Date.parse("2026-11-18T12:00:00.000Z"),NOW,NOW],
    [NOW,NOW,NOW,NOW,Date.parse("2026-11-18T12:00:00.000Z")],
    [NOW,NaN,NOW,NOW,NOW]
  ]){
    const queue=[...timeline];
    const reader=make({now:()=>queue.shift()});
    await assert.rejects(reader.evaluate({tenantId:"tenantA"}),
      /CIMA public source observation denied:/);
  }
});

test("duplicate, new and conflicting Spanish medicine revisions never become publishable",async()=>{
  const generate=async name=>make({
    transport:async()=>new Response(JSON.stringify({...source(),nombre:name}),{
      headers:{"content-type":"application/json"}
    })
  }).evaluate({tenantId:"tenantA"});
  const a=await generate("SYNTHETIC MEDICINE V1");
  const same=await generate("SYNTHETIC MEDICINE V1");
  const different=await generate("SYNTHETIC MEDICINE V2");
  const compare=make();
  const x=compare.compareReplay([],a);
  const y=compare.compareReplay([a],same);
  const z=compare.compareReplay([a],different);
  assert.deepEqual([x.decision,y.decision,z.decision],[
    "QUARANTINE_NEW_CANDIDATE","DUPLICATE","QUARANTINE_CONFLICTING_REVISION"
  ]);
  for(const report of [x,y,z]){
    assert.equal(report.canPublish,false);
    assert.equal(report.productionAccepted,false);
  }
  for(const tampered of [
    {...a,tenantId:"tenantB"},
    {...a,sourceId:"global-trials"},
    {...a,canPublish:true},
    {...a,manifest:{...a.manifest,productionAccepted:true}}
  ]){
    assert.throws(()=>compare.compareReplay([tampered],same),
      /invalid or cross-tenant source replay receipts/);
  }
});
