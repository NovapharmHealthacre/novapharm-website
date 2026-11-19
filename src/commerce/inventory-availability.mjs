// NovaPharm commerce inventory availability: fail-closed, independent of storage provider.
// Never infer physical stock from catalogue counts, seller declarations or guide prices.
const validQuantity = (n) => Number.isSafeInteger(n) && n >= 0;

export function calculateAvailableToPromise(position, approvals = {}, traceability = {}) {
  if (!position || !approvals || !traceability) return 0;
  if (position.verificationStatus !== 'verified' || !position.warehouseId) return 0;
  if (approvals.catalogueVariantVerified !== true || approvals.complianceApproved !== true ||
      approvals.priceCheckoutApproved !== true || approvals.checkoutEnabled !== true) return 0;
  if (traceability.releaseVerified !== true) return 0;
  const fields = ['physicalQuantity', 'reservedQuantity', 'quarantineQuantity', 'damagedQuantity'];
  if (!fields.every((field) => validQuantity(position[field]))) return 0;
  const available = Math.max(0, position.physicalQuantity - position.reservedQuantity -
      position.quarantineQuantity - position.damagedQuantity);
  // Lot/serial or other item-level release evidence must cap the stock that can be offered.
  if (!validQuantity(traceability.releasedQuantity)) return 0;
  return Math.min(available, traceability.releasedQuantity);
}

export function catalogueAndStockGate({product, position, compliance, price, traceability, channelPolicy}) {
  const reasons = [];
  if (!product || !product._id) reasons.push('PRODUCT_MISSING');
  else {
    if (product.recordType !== 'sku') reasons.push('SALEABLE_VARIANT_UNCONFIRMED');
    if (product.saleStatus !== 'active') reasons.push('PRODUCT_NOT_ACTIVE');
    if (product.sellable === false) reasons.push('PRODUCT_SALE_BLOCKED');
  }
  if (!position || position.verificationStatus !== 'verified') reasons.push('STOCK_UNVERIFIED');
  if (!position?.warehouseId) reasons.push('WAREHOUSE_UNASSIGNED');
  if (!compliance?.approvedForCheckout) reasons.push('COMPLIANCE_PENDING');
  if (!price?.checkoutApproved || !validQuantity(price?.basePriceExVatMinor) || price.basePriceExVatMinor === 0)
    reasons.push('CHECKOUT_PRICE_NOT_APPROVED');
  if (!traceability?.releaseVerified) reasons.push('LOT_OR_SERIAL_RELEASE_NOT_VERIFIED');
  if (channelPolicy?.checkoutEnabled !== true) reasons.push('CHANNEL_CHECKOUT_DISABLED');
  const maxQuantity = calculateAvailableToPromise(position, {
    catalogueVariantVerified: product?.recordType === 'sku' && product?.saleStatus === 'active' && product?.sellable === true,
    complianceApproved: compliance?.approvedForCheckout === true,
    priceCheckoutApproved: price?.checkoutApproved === true && validQuantity(price?.basePriceExVatMinor) && price.basePriceExVatMinor > 0,
    checkoutEnabled: channelPolicy?.checkoutEnabled === true,
  }, traceability);
  if (maxQuantity === 0) reasons.push('ZERO_APPROVED_AVAILABILITY');
  return {canCheckout: reasons.length === 0, maxQuantity, reasons: [...new Set(reasons)]};
}

export function validateMovementRequest(movement) {
  if (!movement || typeof movement !== 'object') throw new TypeError('Inventory movement is required');
  if (!/^[-A-Za-z0-9_]{5,90}$/.test(String(movement.productId || ''))) throw new Error('Product ID is required');
  if (!/^[-A-Za-z0-9_]{5,90}$/.test(String(movement.eventId || ''))) throw new Error('Unique event ID is required');
  if (!['RECEIVE','RESERVE','RELEASE','PICK','RETURN','QUARANTINE','ADJUST'].includes(movement.type)) throw new Error('Unsupported inventory movement type');
  if (!Number.isSafeInteger(movement.quantity) || movement.quantity <= 0) throw new Error('Positive integer quantity is required');
  if (!movement.warehouseId || !movement.actorId || !movement.evidenceId) throw new Error('Warehouse, actor and evidence are required');
  if (['RECEIVE','RETURN','ADJUST'].includes(movement.type) && !movement.approvedBy) throw new Error('Approved stock entry or adjustment is required');
  return Object.freeze({...movement});
}
