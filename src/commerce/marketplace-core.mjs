import { catalogueAndStockGate } from './inventory-availability.mjs';

const whole = (n) => Number.isSafeInteger(n) && n >= 0;
const positive = (n) => Number.isSafeInteger(n) && n > 0;
const identifier = (v) => typeof v === 'string' && /^[A-Za-z0-9][A-Za-z0-9:_-]{2,95}$/.test(v);

export function stockSnapshot({product,position,compliance,price,lotRelease,channelPolicy}) {
  const decision = catalogueAndStockGate({product,position,compliance,price,traceability:lotRelease,channelPolicy});
  return Object.freeze({
    sku:product?.sku ?? null,
    ownerDeclaredUnits:whole(position?.ownerDeclaredQuantity) ? position.ownerDeclaredQuantity : null,
    verifiedPhysicalUnits:position?.verificationStatus==='verified' && whole(position?.physicalQuantity) ? position.physicalQuantity : null,
    availableToPromise:decision.maxQuantity,
    inventoryEvidence:position?.verificationStatus==='verified' ? 'warehouse_reconciled' : 'owner_declared_unreconciled',
    checkoutEligible:decision.canCheckout,
    blockedReasons:decision.reasons
  });
}

export function validateOrderLines(lines) {
  if (!Array.isArray(lines) || lines.length<1 || lines.length>50) throw new Error('Basket must contain 1 to 50 lines');
  const seen = new Set();
  return lines.map(line=>{
    if (!line || !identifier(line.productId) || !identifier(line.offerId) || !positive(line.quantity) || line.quantity>10000)
      throw new Error('Invalid order line');
    if (seen.has(line.offerId)) throw new Error('Duplicate offer line');
    seen.add(line.offerId);
    return {productId:line.productId,offerId:line.offerId,quantity:line.quantity};
  });
}

export function reserveForCheckout({line, product, offer, position, compliance, price, lotRelease, channelPolicy}) {
  if (!offer || offer.productId!==line.productId || offer._id!==line.offerId) throw new Error('Offer does not match selected SKU');
  if (offer.sellerStatus!=='approved' || !offer.verifiedMerchantAgreement) throw new Error('Seller has not been approved');
  if (offer.checkoutApproved!==true) throw new Error('Offer not commercially approved');
  const stock=stockSnapshot({product,position,compliance,price,lotRelease,channelPolicy});
  if (!stock.checkoutEligible || stock.availableToPromise<line.quantity)
    throw new Error('Insufficient verified and releasable stock');
  return Object.freeze({productId:line.productId,offerId:line.offerId,merchantId:offer.merchantId,quantity:line.quantity,stockCheck:'verified',priceMinor:price.basePriceExVatMinor,currency:price.currency});
}

export function validateStockEvent(event) {
  if (!event || !identifier(event.eventId) || !identifier(event.productId)||!identifier(event.actorId))
    throw new Error('Inventory event requires unique identity and actor');
  if (!positive(event.quantity) || event.quantity>1000000) throw new Error('Invalid stock event quantity');
  const type=event.type;
  if (!['receive','reserve','release','pick','dispatch','return','quarantine','reconcile'].includes(type)) throw new Error('Unrecognized movement type');
  if (!identifier(event.warehouseId) || !identifier(event.evidenceId)) throw new Error('Stock movements require warehouse and evidence');
  if (['receive','return','reconcile','quarantine'].includes(type) && !identifier(event.approvedBy))
    throw new Error('A separate authorized approver is required');
  if (['receive','return','reconcile','quarantine'].includes(type) && event.approvedBy===event.actorId)
    throw new Error('Stock actor cannot self-approve sensitive movements');
  if (['pick','dispatch','return','release'].includes(type) && !identifier(event.orderId))
    throw new Error('Order-linked movements need an order reference');
  return Object.freeze({eventId:event.eventId,productId:event.productId,warehouseId:event.warehouseId,evidenceId:event.evidenceId,actorId:event.actorId,approvedBy:event.approvedBy??null,orderId:event.orderId??null,quantity:event.quantity,type});
}

export function computeMarketplaceSettlement({grossMerchandiseMinor,taxMinor,shippingMinor=0,commissionBps,fulfilmentFeeMinor=0,paymentProcessingMinor=0,currency='GBP',sellerAgreementApproved}) {
  for(const [name,value] of Object.entries({grossMerchandiseMinor,taxMinor,shippingMinor,commissionBps,fulfilmentFeeMinor,paymentProcessingMinor})){
    if(!whole(value)) throw new Error('Invalid settlement '+name);
  }
  if (commissionBps>10000) throw new Error('Commission cannot exceed 100%');
  if (sellerAgreementApproved!==true) throw new Error('Seller agreement and fee schedule are required');
  if (taxMinor>grossMerchandiseMinor) throw new Error('Tax cannot exceed gross');
  if(!/^[A-Z]{3}$/.test(currency))throw new Error('Invalid currency');
  const netOfTax=grossMerchandiseMinor-taxMinor;
  const commissionMinor=Math.floor((netOfTax*commissionBps+5000)/10000);
  const payoutMinor=netOfTax+shippingMinor-commissionMinor-fulfilmentFeeMinor-paymentProcessingMinor;
  if(payoutMinor<0)throw new Error('Settlement would be negative');
  return Object.freeze({currency,netOfTax,commissionMinor,fulfilmentFeeMinor,paymentProcessingMinor,shippingMinor,payoutMinor,advertisingFeesMinor:0,provisional:true});
}

export function serviceEarnings(events) {
  const allowed=['commission','advertising','fulfilment','subscription','retail_margin','additional_service'];
  const totals=Object.fromEntries(allowed.map(x=>[x,0]));
  let count=0;
  for(const event of events){
    if(!event || !allowed.includes(event.kind) || !whole(event.amountMinor) || event.state!=='settled')continue;
    totals[event.kind]+=event.amountMinor;
    if(!Number.isSafeInteger(totals[event.kind]))throw new Error('Unsafe financial amount');
    count++;
  }
  return {totals,settledEventCount:count,allAmountsMinor:true};
}

export function buildNovaCommerceObservation({date,productId,sourceOrderCount,shippedUnits,grossSalesMinor,verifiedAvailableUnits,ownerDeclaredUnits,originIds=[]}) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!identifier(productId)||![sourceOrderCount,shippedUnits,grossSalesMinor].every(whole))
    throw new Error('Unsupported or incomplete observed commerce data');
  const stockVerified=whole(verifiedAvailableUnits);
  return {date,productId,kind:'observed_commerce',sourceIds:originIds,orderCount:sourceOrderCount,shippedUnits,grossSalesMinor,currency:'GBP',verifiedAvailableUnits:stockVerified?verifiedAvailableUnits:null,ownerDeclaredUnits:whole(ownerDeclaredUnits)?ownerDeclaredUnits:null,
    evidenceLabels:{sales:'observed_fact_from_reconciled_ledger',stock:stockVerified?'observed_fact':'commercial_declaration'},
    forecastsProvided:false,externalMedicineDemandInferred:false,
    decisionStatus:originIds.length>0?'provenance_attached':'provenance_required'};
}
