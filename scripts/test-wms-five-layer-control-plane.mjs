import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";
import { WMS_CONTROL_LAYERS, reviewWmsFiveLayerObservations } from "../src/core/wms-five-layer-readiness.mjs";

const section=(title,rows=[])=>({title,rows,source:"isolated application snapshot"});
const fixture=(sections=[],dataState="synthetic")=>({
  module:{code:"employee.warehouse",area:"employee",slug:"warehouse"},
  dataState,notices:[],sections,
});

test("five and only five independent control layers are present",()=>{
  assert.deepEqual(WMS_CONTROL_LAYERS.map(x=>x.code),
    ["commercial","inventory","quality","orchestration","intelligence"]);
  assert.equal(new Set(WMS_CONTROL_LAYERS.map(x=>x.destination)).size,3);
});
test("warehouse-employee-only response cannot issue binding operations",()=>{
  const r=reviewWmsFiveLayerObservations(fixture([
    section("Commercial fulfilment queue",[{order_number:"ORDER-001"}]),
    section("Inventory ledger",[{sku:"NUTRAXIN-001",available_quantity:99}]),
    section("Quality and recall observations",[{complaint_number:"QC-001"}]),
    section("Shipment and carrier observations",[{shipment_number:"SHP-001"}]),
    section("Integration delivery exceptions",[{event_type:"feed_pending"}]),
  ]));
  assert.equal(r.status,"observation_only");
  assert.equal(r.rows.length,5);
  assert.deepEqual(r.rows.map(x=>x.observedSampleRows),[1,1,1,1,1]);
  assert.deepEqual(new Set(r.rows.map(x=>x.decision)),new Set(["review_only"]));
  assert.deepEqual(new Set(r.rows.map(x=>x.reconciliation)),new Set(["not_independently_proven"]));
  assert.equal(r.inventoryAvailableToPromise,null);
  assert.equal(r.otifPercent,null);
  assert.equal(r.grossContributionMinor,null);
  assert.equal(r.releaseAuthorised,false);
  assert.equal(r.paymentAuthorised,false);
  assert.equal(r.shipmentAuthorised,false);
});
test("zero or absent dataset means unobserved data, never verified zero problems",()=>{
  const r=reviewWmsFiveLayerObservations(fixture([section("Inventory ledger",[])]));
  assert.deepEqual(r.rows.map(x=>x.observedSampleRows),[null,0,null,null,null]);
  assert.ok(r.rows.every(x=>x.reconciliation==="not_independently_proven"));
});
test("invalid or nonemployee module is denied",()=>{
  for(const m of [{module:{code:"customer.dashboard"},sections:[],notices:[]},
    {module:{code:"employee.orders"},sections:[],notices:[]}, {}, null]){
    const r=reviewWmsFiveLayerObservations(m);
    assert.equal(r.status,"blocked");
    assert.equal(r.releaseAuthorised,false);
    assert.equal(r.inventoryAvailableToPromise,null);
  }
});
test("production enterprise records remain unverified regardless of numeric quantities",()=>{
  const r=reviewWmsFiveLayerObservations(fixture([
    section("Inventory ledger",[{sku:"NUTRAXIN-001",available_quantity:10000}])
  ],"canonical"));
  assert.equal(r.rows[1].dataOrigin,"enterprise_application_ledger_not_independently_reconciled");
  assert.equal(r.inventoryAvailableToPromise,null);
});
test("WMS dispatcher keeps the RBAC gate and separate snapshot read model",()=>{
  const dispatch=readFileSync("src/core/enterprise-domain-service.mjs","utf8");
  const overlay=readFileSync("src/core/enterprise-module-overlays.mjs","utf8");
  const base=readFileSync("src/core/enterprise-domain-service-base.mjs","utf8");
  assert.match(dispatch,/rollingWarehouseView\(await enrichWarehouseControlSnapshot\(snapshot\)\)/);
  assert.match(overlay,/Employee warehouse context required\./);
  for(const heading of ["Commercial fulfilment queue","Receiving and purchasing evidence",
    "Quality and recall observations","Return isolation review","Shipment and carrier observations",
    "Integration delivery exceptions","Five-layer control and release evidence"]) {
    assert.ok(overlay.includes(heading),heading);
  }
  assert.match(overlay,/readOnly: true,\s*actions: \[\]/);
  assert.doesNotMatch(base,/metric\("available", "Released available"/);
  assert.match(base,/Recorded availability, not ATP/);
  assert.match(overlay,/OTIF, gross contribution and physical available-to-promise are not measured/);
});
