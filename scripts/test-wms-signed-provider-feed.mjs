import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { reviewSigned3plInventoryFeed } from "../src/core/wms-signed-provider-feed.mjs";

const tenantId = "NOVAPHARM-UK";
const siteId = "POLAR-SPEED-001";
const contractId = "CONTRACT-QTA-001";
const signingSecret = "this-is-test-only-not-a-production-secret-00000001";
const asOf = "2026-11-14T13:00:00Z";
const packet = () => ({
  manifest: {
    tenantId, siteId, contractId,
    sourceSystem:"polar_speed",feedId:"FEED-001",evidenceId:"EVIDENCE-001",
    sha256:"a".repeat(64),synthetic:false,
    reviewState:"evidence_submitted_for_independent_reconciliation",
    capturedAt:"2026-11-14T12:30:00Z"
  },
  lots:[{
    tenantId,siteId,ownerId:"NOVAPHARM-OWNER-001",
    locationId:"BIN-001",sku:"NUTRAXIN-001",batchNumber:"BATCH-001",
    expiryDate:"2027-06-01",onHand:40,reserved:5,quarantined:0,damaged:0,
    qualityStatus:"released",recallStatus:"clear",temperatureStatus:"verified_in_range"
  }]
});
const signed=(p=packet(),params={})=>{
  const rawBody=JSON.stringify(p);
  return {
    rawBody,signatureHex:createHmac("sha256",signingSecret).update(rawBody).digest("hex"),
    signingSecret,contractAccepted:true,tenantId,siteId,contractId,
    trustedSource:"polar_speed",claimUniqueFeed:async()=>true,asOf,...params
  };
};

test("correctly signed exact-scope provider feed can only be staged for independent review",async()=>{
  const seen=[];
  const o=await reviewSigned3plInventoryFeed(signed(packet(),{
    claimUniqueFeed:async(row)=>{seen.push(row);return true;}
  }));
  assert.equal(o.status,"staged_for_independent_reconciliation");
  assert.equal(o.providerTransportVerified,true);
  assert.equal(o.warehouseStockReconciled,false);
  assert.equal(o.availableToPromise,null);
  assert.equal(o.reportedOnHand,40);
  assert.equal(o.reportedReleased,35);
  assert.equal(o.warehouseDispatchCreated,false);
  assert.equal(o.stockReservationCreated,false);
  assert.equal(o.regulatedMedicineReleased,false);
  assert.equal(seen.length,1);
  assert.equal(seen[0].feedId,"FEED-001");
});

test("uncontracted, unsigned, tampered or differently scoped feeds fail before replay claim",async()=>{
  const variants=[
    signed(packet(),{contractAccepted:false}),
    signed(packet(),{signatureHex:"0".repeat(64)}),
    signed(packet(),{signingSecret:"short"}),
    signed({...packet(),manifest:{...packet().manifest,siteId:"OTHER-SITE"}}),
    signed({...packet(),manifest:{...packet().manifest,sourceSystem:"qualified_3pl"}}),
    signed({...packet(),manifest:{...packet().manifest,contractId:"DIFFERENT-CONTRACT"}}),
    signed(packet(),{trustedSource:"unknown"}),
    signed({...packet(),manifest:{...packet().manifest,capturedAt:"2026-11-13T11:00:00Z"}}),
    signed(packet(),{claimUniqueFeed:null}),
  ];
  for(const v of variants){
    let claims=0;
    const opt={...v,claimUniqueFeed:v.claimUniqueFeed===null?null:async()=>{claims++;return true;}};
    const result=await reviewSigned3plInventoryFeed(opt);
    assert.equal(result.status,"blocked",JSON.stringify(result.reasons));
    assert.equal(claims,0);
    assert.equal(result.warehouseStockReconciled,false);
  }
});

test("replay and unavailable duplicate ledger fail without a warehouse command",async()=>{
  const ids=new Set();
  const claimUniqueFeed=async({feedId})=>{
    if(ids.has(feedId))return false;
    ids.add(feedId);
    return true;
  };
  const first=await reviewSigned3plInventoryFeed(signed(packet(),{claimUniqueFeed}));
  const duplicate=await reviewSigned3plInventoryFeed(signed(packet(),{claimUniqueFeed}));
  assert.equal(first.status,"staged_for_independent_reconciliation");
  assert.equal(duplicate.status,"blocked");
  assert.ok(duplicate.reasons.includes("duplicate_or_unconfirmed_feed_claim"));
  const outage=await reviewSigned3plInventoryFeed(signed(packet(),{
    claimUniqueFeed:async()=>{throw new Error("DB unavailable");}
  }));
  assert.equal(outage.status,"blocked");
  assert.equal(outage.stockReservationCreated,false);
});

test("invalid quality, malformed JSON, oversized body and old inventory are blocked",async()=>{
  const damaged=packet();
  damaged.lots[0].reserved=50;
  for(const opt of [
    signed(damaged),
    signed(packet(),{rawBody:"{",signatureHex:createHmac("sha256",signingSecret).update("{").digest("hex")}),
    signed(packet(),{rawBody:" ".repeat(1_048_577)}),
    signed({...packet(),manifest:{...packet().manifest,capturedAt:"2026-11-14T10:00:00Z"}})
  ]){
    const o=await reviewSigned3plInventoryFeed(opt);
    assert.equal(o.status,"blocked");
    assert.equal(o.availableToPromise,null);
  }
});
