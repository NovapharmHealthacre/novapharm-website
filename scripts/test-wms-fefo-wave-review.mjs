import test from "node:test";
import assert from "node:assert/strict";
import { reviewFefoWaveCandidates } from "../src/core/wms-fefo-wave-review.mjs";

const tenantId="NOVAPHARM-UK",siteId="UK-WAREHOUSE-001",ownerId="NOVA-STOCK-001";
const asOf="2026-11-15T12:00:00Z",digest="a".repeat(64);
const lot=(overrides={})=>({
  tenantId,siteId,ownerId,locationId:"BIN-001",sku:"NUTRAXIN-001",
  batchNumber:"BATCH-LATER",expiryDate:"2027-08-01",baseUom:"EA",
  qualityStatus:"released",temperatureStatus:"verified_in_range",recallStatus:"clear",
  onHand:100,reserved:10,quarantined:5,damaged:0,...overrides
});
const manifest=(sourceSystem,extra={})=>({
  tenantId,siteId,sourceSystem,feedId:"FEED-001",evidenceId:"EVIDENCE-001",
  sha256:digest,reviewState:"evidence_submitted_for_independent_reconciliation",
  synthetic:false,capturedAt:"2026-11-15T11:30:00Z",...extra
});
const provider=(lots)=>({manifest:manifest("polar_speed"),lots});
const ledger=(lots)=>({manifest:manifest("novapharm_inventory_ledger"),lines:lots});
const order=(overrides={})=>({
  tenantId,siteId,ownerId,orderId:"ORDER-001",lineId:"LINE-001",
  sku:"NUTRAXIN-001",requestedUnits:20,baseUom:"EA",priority:"standard",
  dueAt:"2026-11-17T10:00:00Z",minRemainingShelfLifeDays:30,...overrides
});
const review=(stock=[lot()],lines=[order()],extra={})=>
  reviewFefoWaveCandidates({providerPacket:provider(stock),ledgerSnapshot:ledger(stock),
    orderLines:lines,tenantId,siteId,ownerId,asOf,...extra});

test("qualifying lot gives review candidate only, never stock execution authority",()=>{
  const r=review();
  assert.equal(r.status,"fefo_wave_candidates_for_independent_review");
  assert.equal(r.ordersReviewed,1);
  assert.equal(r.proposedPicks.length,1);
  assert.equal(r.proposedPicks[0].proposedUnits,20);
  assert.equal(r.proposedWaves[0].taskCandidates,1);
  assert.equal(r.candidateUnits,20);
  for(const name of ["providerAuthenticated","independentlyReconciled","customerTradeAuthorised",
    "qualityReleased","stockReserved","waveReleased","warehouseTasksCreated","pickConfirmed",
    "dispatchAuthorised","customerOrderReleased"])assert.equal(r[name],false,name);
  assert.equal(r.availableToPromise,null);
});

test("FEFO allocates earliest eligible batch first without double counting orders",()=>{
  const later=lot({batchNumber:"BATCH-LATER",locationId:"BIN-003",onHand:30,reserved:0,quarantined:0});
  const earlier=lot({batchNumber:"BATCH-FIRST",locationId:"BIN-001",expiryDate:"2027-02-01",
    onHand:10,reserved:0,quarantined:0});
  const middle=lot({batchNumber:"BATCH-MIDDLE",locationId:"BIN-002",expiryDate:"2027-04-01",
    onHand:20,reserved:0,quarantined:0});
  const lines=[order({orderId:"ORDER-STD",lineId:"LINE-A",requestedUnits:15}),
    order({orderId:"ORDER-URG",lineId:"LINE-A",priority:"urgent",requestedUnits:25})];
  const r=review([later,middle,earlier],lines,{maxTasksPerWave:2});
  assert.deepEqual(r.proposedPicks.map(x=>[x.orderId,x.batchNumber,x.proposedUnits]),[
    ["ORDER-URG","BATCH-FIRST",10],
    ["ORDER-URG","BATCH-MIDDLE",15],
    ["ORDER-STD","BATCH-MIDDLE",5],
    ["ORDER-STD","BATCH-LATER",10],
  ]);
  assert.equal(r.candidateUnits,40);
  assert.deepEqual(r.proposedWaves.map(x=>x.taskCandidates),[2,2]);
  assert.equal(r.shortfalls.length,0);
});

test("partial stock does not fabricate quantities or zero shortfall",()=>{
  const r=review([lot({onHand:10,reserved:2,quarantined:3,damaged:1})],
    [order({requestedUnits:11})]);
  assert.equal(r.status,"partial_fefo_review_with_shortfalls");
  assert.equal(r.candidateUnits,4);
  assert.equal(r.proposedPicks[0].proposedUnits,4);
  assert.deepEqual([r.shortfalls[0].requiredUnits,r.shortfalls[0].unfilledUnits],[11,7]);
  assert.equal(r.stockReserved,false);
});

test("shelf life, recall, temperature, quality and expired lots cannot be picked",()=>{
  const lots=[
    lot({locationId:"BIN-001",batchNumber:"EXPIRING",expiryDate:"2026-11-20"}),
    lot({locationId:"BIN-002",batchNumber:"RECALL",recallStatus:"active"}),
    lot({locationId:"BIN-003",batchNumber:"TEMP",temperatureStatus:"excursion"}),
    lot({locationId:"BIN-004",batchNumber:"QA",qualityStatus:"quarantined"}),
    lot({locationId:"BIN-005",batchNumber:"EXPIRED",expiryDate:"2026-11-01"}),
  ];
  const r=review(lots);
  assert.equal(r.proposedPicks.length,0);
  assert.equal(r.shortfalls[0].unfilledUnits,20);
  assert.equal(r.availableToPromise,null);
});

test("foreign owner never enters candidate pick even when present in same site",()=>{
  const own=lot({onHand:5,reserved:0,quarantined:0});
  const foreign=lot({ownerId:"OTHER-STOCK-OWNER",locationId:"BIN-002",onHand:500,
    reserved:0,quarantined:0});
  const result=review([foreign,own],[order({requestedUnits:20})]);
  assert.equal(result.proposedPicks.length,1);
  assert.equal(result.proposedPicks[0].proposedUnits,5);
  assert.equal(result.shortfalls[0].unfilledUnits,15);
});

test("source reconciliation variance or stale manifest blocks every proposed task",()=>{
  const stock=[lot()];
  for(const extra of [
    {ledgerSnapshot:ledger([lot({onHand:90})])},
    {providerPacket:provider([lot({siteId:"OTHER-SITE"})])},
    {providerPacket:{manifest:manifest("polar_speed",{capturedAt:"2026-11-01T12:00:00Z"}),lots:stock}},
    {ledgerSnapshot:{manifest:manifest("novapharm_inventory_ledger",{synthetic:true}),lines:stock}},
  ]){
    const out=review(stock,[order()],extra);
    assert.equal(out.status,"blocked");
    assert.equal(out.proposedPicks.length,0);
    assert.equal(out.warehouseTasksCreated,false);
  }
});

test("base units and order owner must match exactly, never infer pack conversion",()=>{
  for(const r of [
    review([lot({baseUom:"BOX"})],[order()]),
    review([lot({baseUom:"EA"})],[order({baseUom:"BOX"})]),
    review([lot()],[order({ownerId:"OTHER-STOCK-OWNER"})]),
    review([lot()],[order(),order()]),
    review([lot({baseUom:undefined})],[order()]),
  ]) {
    assert.equal(r.status,"blocked");
    assert.equal(r.proposedPicks.length,0);
  }
});

test("invalid clock, missing demand and oversized wave limit fail closed",()=>{
  const bad=[
    {asOf:"yesterday"}, {orderLines:[]}, {maxTasksPerWave:0},
    {maxTasksPerWave:101}, {orderLines:[order({requestedUnits:-1})]},
    {orderLines:[order({minRemainingShelfLifeDays:3651})]},
    {orderLines:[order({dueAt:"bad"})]},
  ];
  for(const change of bad){
    const r=review([lot()],[order()],change);
    assert.equal(r.status,"blocked");
    assert.equal(r.availableToPromise,null);
    assert.equal(r.waveReleased,false);
  }
});

test("wave grouping is deterministic, bounded and review-only",()=>{
  const many=Array.from({length:7},(_,i)=>order({
    orderId:"ORDER-"+String(i+100),
    lineId:"LINE-"+String(i+100),requestedUnits:2,
  }));
  const r=review([lot({onHand:30,reserved:0,quarantined:0})],many,{maxTasksPerWave:3});
  assert.deepEqual(r.proposedWaves.map(x=>x.taskCandidates),[3,3,1]);
  assert.equal(r.candidateUnits,14);
  assert.ok(Object.isFrozen(r));
  assert.ok(Object.isFrozen(r.proposedPicks));
  assert.ok(Object.isFrozen(r.proposedPicks[0]));
  assert.equal(r.warehouseTasksCreated,false);
});
