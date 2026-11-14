/**
 * Controlled inbound, reverse logistics and recall review.
 * Deliberately no inventory writes, release commands, carrier calls or notices.
 * All decisions are candidates requiring an authenticated quality workflow.
 */
const ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{2,99}$/u;
const DATE=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/u;
const goodId=x=>typeof x==="string"&&ID.test(x);
const goodTime=x=>typeof x==="string"&&DATE.test(x)&&Number.isFinite(Date.parse(x));
const count=x=>Number.isSafeInteger(x)&&x>=0;
const obj=x=>x!==null&&typeof x==="object"&&!Array.isArray(x);
const protect=(value)=>Object.freeze({
  ...value,
  stockAdded:false,qualityReleased:false,saleAuthorised:false,
  returnedStockRestored:false,recallNoticesSent:false,
  warehouseCommandIssued:false,customerContacted:false,
});
const flag=(code,subject)=>Object.freeze({code,subject});

export function reviewInboundReceipt({
  expected,received,scope,asOf=new Date().toISOString()
}={}){
  const fail=(r)=>protect({status:"blocked",issues:Object.freeze(r.map(x=>flag(x,"receipt"))),
    linesReviewed:null,receivedUnits:null,varianceUnits:null});
  if(!obj(scope)||![scope.tenantId,scope.siteId,scope.supplierId,scope.purchaseOrderId].every(goodId)||
     !goodTime(asOf))return fail(["missing_scoped_purchase_order_or_clock"]);
  if(!obj(expected)||!obj(received)||
     expected.tenantId!==scope.tenantId||expected.siteId!==scope.siteId||
     received.tenantId!==scope.tenantId||received.siteId!==scope.siteId||
     expected.purchaseOrderId!==scope.purchaseOrderId||
     received.purchaseOrderId!==scope.purchaseOrderId||
     !goodId(expected.asnId)||!goodId(received.receiptId)||
     !goodId(received.providerEvidenceId)||!goodTime(received.recordedAt)||
     Date.parse(received.recordedAt)>Date.parse(asOf)||
     !Array.isArray(expected.lines)||!Array.isArray(received.lines)||
     expected.lines.length===0||received.lines.length===0||
     expected.lines.length>5000||received.lines.length>5000)
    return fail(["unverified_asn_or_physical_receipt"]);
  const issue=[];
  const expectedMap=new Map();
  for(const line of expected.lines){
    if(!obj(line)||![line.sku,line.batchNumber,line.ownerId].every(goodId)||
       !count(line.quantity)||line.quantity===0){
      issue.push(flag("invalid_asn_line","receipt"));continue;
    }
    const key=[line.ownerId,line.sku,line.batchNumber].join("|");
    if(expectedMap.has(key))issue.push(flag("duplicate_asn_line",key));
    expectedMap.set(key,line.quantity);
  }
  const seen=new Set();let units=0;let variances=0;
  for(const line of received.lines){
    if(!obj(line)||![line.sku,line.batchNumber,line.ownerId,line.providerLineId].every(goodId)||
       !count(line.quantityReceived)||!count(line.quantityDamaged)||
       line.quantityDamaged>line.quantityReceived||
       !["held_for_quality_review","quarantined","rejected"].includes(line.qualityState)){
      issue.push(flag("invalid_or_unreviewed_receipt_line","receipt"));continue;
    }
    const key=[line.ownerId,line.sku,line.batchNumber].join("|");
    if(seen.has(key))issue.push(flag("duplicate_receipt_line",key));
    seen.add(key);
    if(!expectedMap.has(key))issue.push(flag("unexpected_sku_batch_or_owner",key));
    else if(line.quantityReceived!==expectedMap.get(key)){
      issue.push(flag("received_quantity_variance",key));
      variances+=Math.abs(line.quantityReceived-expectedMap.get(key));
    }
    if(line.quantityDamaged>0)issue.push(flag("damage_requires_quality_review",key));
    units+=line.quantityReceived;
    if(!Number.isSafeInteger(units)||!Number.isSafeInteger(variances))
      return fail(["receipt_quantity_overflow"]);
  }
  for(const [key,value] of expectedMap){
    if(!seen.has(key)){issue.push(flag("expected_line_not_received",key));variances+=value;}
  }
  return protect({
    status:issue.length?"exceptions_require_quality_review":"receipt_candidate_for_quality_review",
    issues:Object.freeze(issue),linesReviewed:received.lines.length,
    receivedUnits:units,varianceUnits:variances,
    evidenceId:received.providerEvidenceId,
  });
}

export function reviewWarehouseReturn({
  original,returnCase,quality,scope,asOf=new Date().toISOString()
}={}){
  const blockers=[];
  if(!obj(scope)||![scope.tenantId,scope.siteId,scope.orderId,scope.sku,scope.batchNumber].every(goodId)||
      !goodTime(asOf))blockers.push("missing_authorised_return_scope");
  if(!obj(original)||original.tenantId!==scope?.tenantId||
    original.siteId!==scope?.siteId||original.orderId!==scope?.orderId||
    original.sku!==scope?.sku||original.batchNumber!==scope?.batchNumber||
    !count(original.dispatchedQuantity))blockers.push("original_shipment_not_reconciled");
  if(!obj(returnCase)||!goodId(returnCase.rmaId)||!goodId(returnCase.evidenceId)||
    returnCase.tenantId!==scope?.tenantId||returnCase.siteId!==scope?.siteId||
    returnCase.orderId!==scope?.orderId||returnCase.sku!==scope?.sku||
    returnCase.batchNumber!==scope?.batchNumber||
    !count(returnCase.receivedQuantity)||returnCase.receivedQuantity===0||
    (count(original?.dispatchedQuantity)&&returnCase.receivedQuantity>original.dispatchedQuantity)||
    !["isolated_at_3pl","quarantined"].includes(returnCase.currentState))
    blockers.push("return_not_received_to_controlled_hold");
  if(!obj(quality)||quality.independentReview!==true||
     !goodId(quality.evidenceId)||!goodId(quality.reviewerId)||
     quality.mfaVerified!==true||!goodTime(quality.reviewedAt)||
     Date.parse(quality.reviewedAt)>Date.parse(asOf)||
     !["dispose","supplier_return","investigate"].includes(quality.proposedDisposition))
    blockers.push("quality_disposition_not_independently_reviewed");
  return protect({
    status:blockers.length?"blocked":"disposition_candidate_for_authorised_execution",
    blockers:Object.freeze(blockers),
    proposedDisposition:blockers.length?null:quality.proposedDisposition,
    rmaId:goodId(returnCase?.rmaId)?returnCase.rmaId:null,
  });
}

export function reviewBatchRecallExposure({
  scope,shipments,warehousePositions,asOf=new Date().toISOString()
}={}){
  const denied=(reason)=>protect({
    status:"blocked",reason,affectedCustomers:null,affectedSites:null,
    observedShipmentCount:null,observedStockPositions:null,
    evidenceComplete:false,recipientCandidates:Object.freeze([]),
  });
  if(!obj(scope)||![scope.tenantId,scope.sku,scope.batchNumber,scope.recallEvidenceId].every(goodId)||
     !goodTime(asOf)||!Array.isArray(shipments)||!Array.isArray(warehousePositions)||
     shipments.length>50000||warehousePositions.length>50000)
    return denied("recall_scope_or_evidence_missing");
  const recipients=new Set();const sites=new Set();const seenShipments=new Set();
  let matches=0;let stockMatches=0;
  for(const row of shipments){
    if(!obj(row)||row.tenantId!==scope.tenantId||!goodId(row.shipmentId)||
      !goodId(row.sku)||!goodId(row.batchNumber)||!goodId(row.siteId)||
      !goodId(row.customerId)||!goodId(row.carrierEvidenceId)||!goodTime(row.shippedAt)||
      Date.parse(row.shippedAt)>Date.parse(asOf)||seenShipments.has(row.shipmentId))
      return denied("unverified_or_duplicate_shipment_evidence");
    seenShipments.add(row.shipmentId);
    if(row.sku===scope.sku&&row.batchNumber===scope.batchNumber){
      matches++;recipients.add(row.customerId);sites.add(row.siteId);
    }
  }
  for(const row of warehousePositions){
    if(!obj(row)||row.tenantId!==scope.tenantId||!goodId(row.siteId)||
      !goodId(row.sku)||!goodId(row.batchNumber)||!count(row.onHand)||
      !goodId(row.evidenceId))return denied("unverified_warehouse_exposure");
    if(row.sku===scope.sku&&row.batchNumber===scope.batchNumber){
      stockMatches++;sites.add(row.siteId);
    }
  }
  // An empty feed is NEVER evidence that nobody received the recalled lot.
  if(shipments.length===0||warehousePositions.length===0)
    return denied("network_coverage_not_established");
  return protect({
    status:"potential_recall_exposure_for_quality_review",
    reason:"network_coverage_and_authorised_recall_action_still_required",
    affectedCustomers:recipients.size,affectedSites:sites.size,
    observedShipmentCount:matches,observedStockPositions:stockMatches,
    evidenceComplete:false,
    recipientCandidates:Object.freeze([...recipients].sort()),
  });
}
