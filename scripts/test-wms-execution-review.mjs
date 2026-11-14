import assert from "node:assert/strict";
import test from "node:test";
import {
  reviewWarehouseFulfilmentLineage,estimateQualified3plCharges
} from "../src/core/wms-execution-review.mjs";

const asOf="2026-11-14T13:00:00Z";
const tenantId="NOVAPHARM-UK";
const siteId="POLAR-SPEED-UK-001";
const opts={tenantId,siteId,asOf};
const manifest={
  tenantId,siteId,feedId:"FEED-001",evidenceId:"EVIDENCE-001",
  sha256:"a".repeat(64),synthetic:false,sourceSystem:"polar_speed",
  reviewState:"evidence_submitted_for_independent_reconciliation",
  capturedAt:"2026-11-14T12:30:00Z"
};
const kinds=[
  "ORDER_ACCEPTED","ALLOCATION_CONFIRMED","PICK_CONFIRMED",
  "PACK_CONFIRMED","DISPATCH_CONFIRMED","DELIVERY_CONFIRMED"
];
const event=(kind,i,overrides={})=>({
  eventId:"EVENT-"+i,orderId:"ORDER-001",tenantId,siteId,
  kind,evidenceId:"EVIDENCE-EVENT-"+i,
  occurredAt:`2026-11-14T12:${String(i).padStart(2,"0")}:00Z`,
  sku:"NUTRAXIN-001",batchNumber:"BATCH-001",
  carrierReference:"UPS-CONSIGNMENT-001",
  proofOfDeliveryReference:"POD-001",...overrides
});
const events=kinds.map(event);
const review=(list,meta=manifest)=>reviewWarehouseFulfilmentLineage({events:list,manifest:meta,...opts});

test("full synthetic-style shaped carrier events remain observational, not authoritative",()=>{
  const out=review(events);
  assert.equal(out.status,"observations_for_independent_review");
  assert.equal(out.observedOrders,1);
  assert.equal(out.observedEvents,6);
  assert.equal(out.workflows[0].lastStage,"DELIVERY_CONFIRMED");
  assert.deepEqual(out.exceptions,[]);
  for(const action of ["sourceReconciled","acceptedWarehouseTransaction","stockReserved",
    "dispatchAuthorised","deliveryEstablished","customerOrderReleased","invoiceAuthorised","carrierBooked"])
    assert.equal(out[action],false,action);
});

test("incomplete order journey remains in progress rather than fabricated completion",()=>{
  const out=review(events.slice(0,3));
  assert.equal(out.status,"observations_for_independent_review");
  assert.equal(out.workflows[0].lastStage,"PICK_CONFIRMED");
  assert.equal(out.deliveryEstablished,false);
});

test("missing receipt, duplicate, bad carrier, skipped stage, missing batch all trigger exceptions",()=>{
  const cases=[
    [events[1],events[2]],
    [events[0],events[0]],
    events.map(e=>e.kind==="DISPATCH_CONFIRMED"?{...e,carrierReference:null}:e),
    events.filter(e=>e.kind!=="PACK_CONFIRMED"),
    events.map(e=>e.kind==="PICK_CONFIRMED"?{...e,batchNumber:null}:e)
  ];
  for(const list of cases){
    const out=review(list);
    assert.notEqual(out.status,"observations_for_independent_review");
    assert.ok(out.exceptions.length>0);
    assert.equal(out.dispatchAuthorised,false);
  }
});

test("tenant scope, stale manifest, future event and duplicate event IDs block",()=>{
  const invalid=[
    {events,manifest:{...manifest,tenantId:"OTHER-TENANT"}},
    {events,manifest:{...manifest,capturedAt:"2026-11-10T12:00:00Z"}},
    {events,manifest:{...manifest,synthetic:true}},
    {events,manifest:{...manifest,sha256:"bad"}},
    {events:[event("ORDER_ACCEPTED",0,{tenantId:"OTHER-TENANT"})],manifest},
    {events:[event("ORDER_ACCEPTED",0,{occurredAt:"2026-11-15T10:00:00Z"})],manifest},
  ];
  for(const item of invalid){
    const out=reviewWarehouseFulfilmentLineage({...item,...opts});
    assert.equal(out.status,"blocked");
    assert.equal(out.stockReserved,false);
  }
});

const rateCard={
  tenantId,siteId,country:"GB",currency:"GBP",reviewed:true,
  synthetic:false,evidenceId:"RATE-EVIDENCE-001",
  sha256:"b".repeat(64),validUntil:"2026-12-31T23:59:59Z",
  ratesMinor:{inboundPallet:395,outboundBox:75,storagePalletDay:25,returnParcel:1495}
};
const usage={units:{inboundPallet:1,outboundBox:4,storagePalletDay:3,returnParcel:1}};
test("cost engine computes only qualified 3PL estimate in currency minor units",()=>{
  const out=estimateQualified3plCharges({rateCard,usage,...opts,country:"GB"});
  assert.equal(out.status,"cost_estimate_requires_invoice_reconciliation");
  assert.equal(out.amountMinor,2265);
  assert.equal(out.currency,"GBP");
  assert.equal(out.invoiceMatched,false);
  assert.equal(out.paymentDue,false);
  assert.equal(out.dispatchAuthorised,false);
});

test("missing rates, wrong country, stale scope or unreviewed price never create fake margin",()=>{
  const invalid=[
    {rateCard:{...rateCard,reviewed:false}},
    {rateCard:{...rateCard,country:"US"}},
    {rateCard:{...rateCard,validUntil:"2026-01-01T00:00:00Z"}},
    {rateCard:{...rateCard,ratesMinor:{...rateCard.ratesMinor,outboundBox:undefined}}},
    {usage:{units:{...usage.units,inboundPallet:-1}}},
  ];
  for(const changed of invalid){
    const out=estimateQualified3plCharges({rateCard,usage,country:"GB",...opts,...changed});
    assert.equal(out.status,"not_estimated");
    assert.equal(out.amountMinor,null);
    assert.equal(out.invoiceMatched,false);
  }
});
