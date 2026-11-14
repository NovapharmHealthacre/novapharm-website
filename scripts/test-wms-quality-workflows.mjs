import test from "node:test";
import assert from "node:assert/strict";
import {
  reviewInboundReceipt,reviewWarehouseReturn,reviewBatchRecallExposure,
} from "../src/core/wms-quality-workflows.mjs";

const asOf="2026-11-14T13:00:00Z";
const scope={tenantId:"NOVAPHARM-UK",siteId:"UK-WAREHOUSE-001",
  supplierId:"ESCO-ANAND-001",purchaseOrderId:"PO-001"};
const expected={tenantId:scope.tenantId,siteId:scope.siteId,
  purchaseOrderId:scope.purchaseOrderId,asnId:"ASN-001",
  lines:[{ownerId:"NOVA-OWNER-001",sku:"ESCO-MODEL-001",batchNumber:"SERIES-001",quantity:15}]};
const received={tenantId:scope.tenantId,siteId:scope.siteId,
  purchaseOrderId:scope.purchaseOrderId,receiptId:"RECEIPT-001",
  providerEvidenceId:"WMS-EVIDENCE-001",recordedAt:"2026-11-14T12:00:00Z",
  lines:[{providerLineId:"3PL-LINE-001",ownerId:"NOVA-OWNER-001",
    sku:"ESCO-MODEL-001",batchNumber:"SERIES-001",quantityReceived:15,
    quantityDamaged:0,qualityState:"held_for_quality_review"}]};
const inbound=(e=expected,r=received,s=scope)=>reviewInboundReceipt({expected:e,received:r,scope:s,asOf});

test("matched ASN and confirmed receipt create only quality-review candidate",()=>{
  const v=inbound();
  assert.equal(v.status,"receipt_candidate_for_quality_review");
  assert.equal(v.receivedUnits,15);
  assert.equal(v.varianceUnits,0);
  assert.deepEqual(v.issues,[]);
  assert.equal(v.stockAdded,false);
  assert.equal(v.qualityReleased,false);
  assert.equal(v.warehouseCommandIssued,false);
});
test("overage, shortage, damage, extra products and duplicate lines create review exceptions",()=>{
  const cases=[
    {...received,lines:[{...received.lines[0],quantityReceived:18}]},
    {...received,lines:[{...received.lines[0],quantityReceived:12}]},
    {...received,lines:[{...received.lines[0],quantityDamaged:2}]},
    {...received,lines:[{...received.lines[0],sku:"OTHER-MODEL-001"}]},
    {...received,lines:[received.lines[0],received.lines[0]]}
  ];
  for(const r of cases){
    const v=inbound(expected,r);
    assert.equal(v.status,"exceptions_require_quality_review");
    assert.ok(v.issues.length>0);
    assert.equal(v.stockAdded,false);
  }
});
test("missing physical receipt, wrong tenant, zero ASN and future receipt reject",()=>{
  const items=[
    [expected,{...received,lines:[]}],
    [{...expected,lines:[]},received],
    [expected,{...received,tenantId:"OTHER-TENANT"}],
    [expected,{...received,recordedAt:"2026-11-15T12:00:00Z"}],
  ];
  for(const [e,r] of items)assert.equal(inbound(e,r).status,"blocked");
});

const returnScope={tenantId:"NOVAPHARM-UK",siteId:"UK-WAREHOUSE-001",
  orderId:"ORDER-001",sku:"NUTRAXIN-001",batchNumber:"BATCH-001"};
const original={...returnScope,dispatchedQuantity:5};
const returnCase={...returnScope,rmaId:"RMA-001",evidenceId:"RMA-EVIDENCE-001",
  receivedQuantity:2,currentState:"quarantined"};
const quality={independentReview:true,evidenceId:"QMS-001",reviewerId:"RP-001",
  mfaVerified:true,reviewedAt:"2026-11-14T12:00:00Z",proposedDisposition:"investigate"};
const review=(r=returnCase,q=quality,o=original)=>
  reviewWarehouseReturn({original:o,returnCase:r,quality:q,scope:returnScope,asOf});
test("received returns stay quarantined even with human-approved investigation",()=>{
  const v=review();
  assert.equal(v.status,"disposition_candidate_for_authorised_execution");
  assert.equal(v.proposedDisposition,"investigate");
  assert.equal(v.returnedStockRestored,false);
  assert.equal(v.saleAuthorised,false);
});
test("over-return, missing reviewer MFA, no QA, unisolated goods cannot restore inventory",()=>{
  for(const [r,q] of [
    [{...returnCase,receivedQuantity:6},quality],
    [returnCase,{...quality,mfaVerified:false}],
    [returnCase,{...quality,independentReview:false}],
    [{...returnCase,currentState:"restocked"},quality]
  ]){
    const v=review(r,q);
    assert.equal(v.status,"blocked");
    assert.equal(v.returnedStockRestored,false);
  }
});
const recallScope={tenantId:"NOVAPHARM-UK",sku:"NUTRAXIN-001",
  batchNumber:"BATCH-001",recallEvidenceId:"RECALL-001"};
const shipment=(overrides={})=>({
  tenantId:recallScope.tenantId,shipmentId:"SHIPMENT-001",
  sku:recallScope.sku,batchNumber:recallScope.batchNumber,
  siteId:"UK-WAREHOUSE-001",customerId:"CUSTOMER-001",
  carrierEvidenceId:"CARRIER-001",shippedAt:"2026-11-13T11:00:00Z",...overrides
});
const position=(overrides={})=>({
  tenantId:recallScope.tenantId,siteId:"UK-WAREHOUSE-001",
  sku:recallScope.sku,batchNumber:recallScope.batchNumber,
  onHand:20,evidenceId:"POSITION-001",...overrides
});
const recall=(shipments=[shipment()],warehousePositions=[position()])=>
  reviewBatchRecallExposure({scope:recallScope,shipments,warehousePositions,asOf});
test("recall identifies potential customer/site exposure but does not notify or release",()=>{
  const r=recall();
  assert.equal(r.status,"potential_recall_exposure_for_quality_review");
  assert.equal(r.affectedCustomers,1);
  assert.equal(r.affectedSites,1);
  assert.deepEqual(r.recipientCandidates,["CUSTOMER-001"]);
  assert.equal(r.recallNoticesSent,false);
  assert.equal(r.evidenceComplete,false);
});
test("empty network source, cross-tenant record and duplicate shipment block recall certainty",()=>{
  const cases=[
    [[],[position()]],
    [[shipment()],[]],
    [[shipment({tenantId:"OTHER-TENANT"})],[position()]],
    [[shipment(),shipment()],[position()]],
  ];
  for(const [s,p] of cases){
    const r=recall(s,p);
    assert.equal(r.status,"blocked");
    assert.equal(r.affectedCustomers,null);
    assert.equal(r.recallNoticesSent,false);
  }
});
