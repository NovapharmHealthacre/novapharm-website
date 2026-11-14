import test from "node:test";
import assert from "node:assert/strict";
import {review3plInventoryReconciliation} from "../src/core/wms-network-reconciliation.mjs";

const tenantId="NOVAPHARM-UK",siteId="UK-WAREHOUSE-001";
const asOf="2026-11-14T12:00:00Z";
const lot=(overrides={})=>({
  tenantId,siteId,ownerId:"NOVA-STOCK-001",locationId:"BIN-001",
  sku:"NUTRAXIN-001",batchNumber:"BATCH-001",expiryDate:"2027-06-30",
  qualityStatus:"released",temperatureStatus:"verified_in_range",recallStatus:"clear",
  onHand:100,reserved:10,quarantined:5,damaged:0,...overrides
});
const manifest=(sourceSystem,changes={})=>({
  tenantId,siteId,sourceSystem,feedId:"FEED-001",evidenceId:"EVIDENCE-001",
  sha256:"a".repeat(64),reviewState:"evidence_submitted_for_independent_reconciliation",
  synthetic:false,capturedAt:"2026-11-14T11:30:00Z",...changes
});
const provider=(lots=[lot()])=>({manifest:manifest("polar_speed"),lots});
const ledger=(lines=[lot()])=>({manifest:manifest("novapharm_inventory_ledger"),lines});
const run=(p=provider(),l=ledger(),additional={})=>
  review3plInventoryReconciliation({providerPacket:p,ledgerSnapshot:l,tenantId,siteId,asOf,...additional});

test("matching provider and ledger remains a review candidate, not verified ATP",()=>{
  const r=run();
  assert.equal(r.status,"candidate_for_independent_reconciliation");
  assert.equal(r.comparedLots,1);
  assert.deepEqual(r.varianceRows,[]);
  assert.equal(r.availableToPromise,null);
  assert.equal(r.sourceReconciled,false);
  assert.equal(r.saleAuthorised,false);
  assert.equal(r.inventoryCountAccepted,false);
  assert.equal(r.stockAdjustmentIssued,false);
});

test("each bin and stock owner must reconcile independently",()=>{
  const other=lot({locationId:"BIN-002",onHand:20,reserved:0,quarantined:0});
  const good=run(provider([lot(),other]),ledger([lot(),other]));
  assert.equal(good.comparedLots,2);
  assert.equal(good.status,"candidate_for_independent_reconciliation");
  const bad=run(provider([lot(),other]),ledger([lot()]));
  assert.equal(bad.status,"variance_requires_review");
  assert.equal(bad.varianceRows[0].reason,"ledger_row_missing");
});

test("mismatched quarantine, held stock and missing lots are explicit variances",()=>{
  const q=run(provider(),ledger([lot({quarantined:3})]));
  assert.equal(q.status,"variance_requires_review");
  assert.equal(q.varianceRows[0].deltas.quarantined,2);
  const missing=run(provider([]),ledger());
  assert.equal(missing.varianceRows[0].reason,"provider_row_missing");
  assert.equal(missing.stockAdjustmentIssued,false);
});

test("foreign tenant, replayed bin, stale ledger and missing evidence all block",()=>{
  const cases=[
    [provider([lot({tenantId:"OTHER-TENANT"})]),ledger()],
    [provider(),ledger([lot({ownerId:"OTHER-OWNER"})])],
    [provider(),ledger([lot(),lot()])],
    [provider(),{...ledger(),manifest:manifest("novapharm_inventory_ledger",{synthetic:true})}],
    [provider(),{...ledger(),manifest:manifest("novapharm_inventory_ledger",{capturedAt:"2026-11-01T12:00:00Z"})}],
  ];
  for(const [p,l] of cases){
    const r=run(p,l);
    assert.notEqual(r.status,"candidate_for_independent_reconciliation");
    assert.equal(r.availableToPromise,null);
    assert.equal(r.dispatchAuthorised,false);
  }
});
