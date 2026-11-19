/**
 * A read-only, independently reviewable warehouse event chain.
 * Inspired by WMS/WES control principles; it is not a physical WMS replacement.
 * Provenance checks validate *shape*, not external signatures or production truth.
 */
const ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{2,99}$/u;
const TIME=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/u;
const DIGEST=/^[a-f0-9]{64}$/iu;
const kinds=Object.freeze([
  "ORDER_ACCEPTED","ALLOCATION_CONFIRMED","PICK_CONFIRMED",
  "PACK_CONFIRMED","DISPATCH_CONFIRMED","DELIVERY_CONFIRMED",
]);
const expected=Object.freeze(Object.fromEntries(kinds.map((k,i)=>[k,i])));
const id=v=>typeof v==="string"&&ID.test(v);
const stamp=v=>typeof v==="string"&&TIME.test(v)&&Number.isFinite(Date.parse(v))?Date.parse(v):NaN;
const obj=v=>v!==null&&typeof v==="object"&&!Array.isArray(v);
function envelope(base) {
  return Object.freeze({...base, sourceReconciled:false,
    acceptedWarehouseTransaction:false,stockReserved:false,
    dispatchAuthorised:false,deliveryEstablished:false,
    customerOrderReleased:false,invoiceAuthorised:false,
    carrierBooked:false});
}
function exception(code,orderId=null,evidenceId=null) {
  return Object.freeze({code,orderId,evidenceId});
}
/**
 * Review an observed order-to-delivery lineage from a provider feed.
 * Valid shape never claims POD; finance, carrier and RP confirmations are separate.
 * Intermediate states are allowed (an order may still be in progress).
 */
export function reviewWarehouseFulfilmentLineage({
  events,manifest,tenantId,siteId,asOf=new Date().toISOString()
}={}) {
  const fail=(codes)=>envelope({status:"blocked",
    exceptions:Object.freeze([...new Set(codes)].map(c=>exception(c))),
    observedOrders:null,observedEvents:null,workflows:Object.freeze([])});
  const at=stamp(asOf);
  if(!id(tenantId)||!id(siteId)||!Number.isFinite(at))
    return fail(["missing_trusted_scope_or_clock"]);
  if(!obj(manifest)||manifest.tenantId!==tenantId||manifest.siteId!==siteId||
    !id(manifest.feedId)||!id(manifest.evidenceId)||
    !DIGEST.test(manifest.sha256||"")||
    manifest.sourceSystem!=="qualified_3pl" &&
    manifest.sourceSystem!=="polar_speed" && manifest.sourceSystem!=="ups_marken" ||
    manifest.synthetic!==false||manifest.reviewState!=="evidence_submitted_for_independent_reconciliation")
    return fail(["unqualified_3pl_source_manifest"]);
  const captured=stamp(manifest.capturedAt);
  if(!Number.isFinite(captured)||captured>at||at-captured>86400000)
    return fail(["stale_or_future_3pl_event_feed"]);
  if(!Array.isArray(events)||events.length>20000)
    return fail(["invalid_event_collection"]);
  const exceptions=[];
  const seen=new Set();
  const groups=new Map();
  for(const e of events){
    if(!obj(e)||e.tenantId!==tenantId||e.siteId!==siteId||
      !id(e.eventId)||!id(e.orderId)||!id(e.evidenceId)||
      !kinds.includes(e.kind)||!Number.isFinite(stamp(e.occurredAt))||
      stamp(e.occurredAt)>captured||stamp(e.occurredAt)>at){
      exceptions.push(exception("invalid_or_out_of_scope_event"));
      continue;
    }
    if(seen.has(e.eventId)) {
      exceptions.push(exception("duplicate_event_id",e.orderId,e.evidenceId));
      continue;
    }
    seen.add(e.eventId);
    if(!groups.has(e.orderId))groups.set(e.orderId,[]);
    groups.get(e.orderId).push(e);
  }
  if(exceptions.length) return envelope({
    status:"blocked",exceptions:Object.freeze(exceptions),
    observedOrders:null,observedEvents:events.length,workflows:Object.freeze([])
  });
  const workflows=[];
  for(const [orderId,items] of groups){
    items.sort((a,b)=>stamp(a.occurredAt)-stamp(b.occurredAt)||
      expected[a.kind]-expected[b.kind]);
    const problems=[];
    let last=-1;
    let lastTime=-Infinity;
    for(const e of items){
      const step=expected[e.kind];
      const time=stamp(e.occurredAt);
      if(step!==last+1)problems.push("missing_or_out_of_sequence_warehouse_stage");
      if(time<lastTime)problems.push("non_monotonic_event_time");
      if(step>=2 && (!id(e.sku)||!id(e.batchNumber)))problems.push("missing_batch_traceability");
      if(step>=4 && !id(e.carrierReference))problems.push("missing_carrier_reference");
      if(step===5 && !id(e.proofOfDeliveryReference))problems.push("missing_delivery_proof");
      last=step;lastTime=time;
    }
    for(const code of new Set(problems)) exceptions.push(exception(code,orderId,items.at(-1)?.evidenceId));
    workflows.push(Object.freeze({
      orderId,stagesObserved:items.length,lastStage:items.at(-1)?.kind||null,
      // Even a complete 3PL timeline requires independent carrier and finance reconciliation.
      reviewState:problems.length?"exception_requires_review":"observed_not_independently_reconciled"
    }));
  }
  return envelope({
    status:exceptions.length?"exceptions_require_review":"observations_for_independent_review",
    exceptions:Object.freeze(exceptions),
    observedOrders:groups.size,observedEvents:events.length,
    workflows:Object.freeze(workflows)
  });
}

/**
 * Optional costing model, based on 3PL rating concepts.
 * Can only show an estimate from an independently reviewed applicable rate card.
 * A mismatch, unverified quote or missing charge produces null, not a zero cost.
 */
export function estimateQualified3plCharges({
  rateCard,usage,tenantId,siteId,country,asOf=new Date().toISOString()
}={}) {
  const blocked=(reasons)=>envelope({
    status:"not_estimated",reasons:Object.freeze(reasons),amountMinor:null,
    currency:null,invoiceMatched:false,paymentDue:false
  });
  const asTime=stamp(asOf);
  if(!obj(rateCard)||!obj(usage)||!id(tenantId)||!id(siteId)||
    !/^[A-Z]{2}$/u.test(country||"")||!Number.isFinite(asTime))
    return blocked(["scope_or_inputs_missing"]);
  if(rateCard.tenantId!==tenantId||rateCard.siteId!==siteId||
    rateCard.country!==country||rateCard.reviewed!==true||
    rateCard.synthetic!==false||!id(rateCard.evidenceId)||
    !DIGEST.test(rateCard.sha256||"")||
    !/^[A-Z]{3}$/u.test(rateCard.currency||"")||
    !Number.isFinite(stamp(rateCard.validUntil))||stamp(rateCard.validUntil)<=asTime)
    return blocked(["rate_card_not_approved_for_exact_scope"]);
  const rates=rateCard.ratesMinor;
  const units=usage.units;
  const keys=["inboundPallet","outboundBox","storagePalletDay","returnParcel"];
  if(!obj(rates)||!obj(units)||keys.some(k=>!Number.isSafeInteger(rates[k])||
     rates[k]<0||!Number.isSafeInteger(units[k])||units[k]<0))
    return blocked(["rate_or_usage_not_reconciled"]);
  let total=0;
  for(const k of keys){
    const item=rates[k]*units[k];
    if(!Number.isSafeInteger(item)||!Number.isSafeInteger(total+item))
      return blocked(["cost_overflow"]);
    total+=item;
  }
  return envelope({
    status:"cost_estimate_requires_invoice_reconciliation",
    reasons:Object.freeze(["actual_3pl_invoice_and_service_scope_not_verified"]),
    amountMinor:total,currency:rateCard.currency,invoiceMatched:false,
    paymentDue:false,evidenceId:rateCard.evidenceId
  });
}
