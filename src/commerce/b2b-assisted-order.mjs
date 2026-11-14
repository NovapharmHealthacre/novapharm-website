/**
 * Fail-closed, side-effect-free employee-assisted B2B order intake.
 *
 * This file does NOT create an order, allocate inventory, accept a quote,
 * charge a card, send communications or authorise medicinal wholesale.
 * A trusted server MUST provide every actor, account, caller and catalogue fact.
 * Never import this file as a browser-side authorisation mechanism.
 */
const REF = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,95}$/;
const CHANNELS = new Set(['telephone', 'sales-representative', 'customer-portal']);
const PRODUCT_TYPES = new Set(['supplement', 'medical-device', 'regulated-medicine', 'other']);
const whole = value => Number.isSafeInteger(value) && value > 0;
const validRef = value => typeof value === 'string' && REF.test(value);
function requireProof(value, message) {
  if (!value) throw new Error(message);
}
function accountAccess(actor, account, caller) {
  requireProof(actor?.sessionAuthority === 'verified-server-session' && actor?.mfaVerified === true,
    'Verified staff server session and MFA required');
  requireProof(['employee', 'admin'].includes(actor.role) && validRef(actor.actorId),
    'Employee or administrator role required');
  requireProof(validRef(account?.accountId) && account.status === 'active' &&
    account.qualificationStatus === 'approved' && account.legalEntityVerified === true,
    'Qualified active B2B customer required');
  requireProof(Array.isArray(actor.assignedAccountIds) && actor.assignedAccountIds.includes(account.accountId),
    'Staff member has no assignment to the account');
  requireProof(caller?.verificationStatus === 'verified' &&
    ['registered-contact-challenge', 'authenticated-customer-session'].includes(caller.method) &&
    validRef(caller.proofRef),
    'Caller identity proof required');
}
function safeAvailability(product) {
  // Public statements must not turn owner declarations into confirmed ATP.
  const verified = product?.stockEvidence === 'warehouse-reconciled' &&
    product?.lotReleased === true &&
    Number.isSafeInteger(product?.availableToPromise) &&
    product.availableToPromise > 0;
  return verified ? 'verified_stock_subject_to_order_approval' : 'availability_unverified';
}
export function prepareB2BAssistedOrderRequest({actor, account, caller, channel, requestId,
  requestedLines, serverCatalogue}) {
  accountAccess(actor, account, caller);
  requireProof(CHANNELS.has(channel), 'Unsupported assisted order channel');
  requireProof(validRef(requestId), 'Request idempotency reference required');
  requireProof(Array.isArray(requestedLines) && requestedLines.length > 0 && requestedLines.length <= 50,
    'Request must contain 1 to 50 lines');
  requireProof(Array.isArray(serverCatalogue), 'Server catalogue required');
  const products = new Map();
  for (const product of serverCatalogue) {
    requireProof(validRef(product?.sku) && PRODUCT_TYPES.has(product.type) && !products.has(product.sku),
      'Invalid or duplicate server catalogue reference');
    products.set(product.sku, product);
  }
  const seen = new Set();
  const lines = requestedLines.map(line => {
    requireProof(validRef(line?.sku) && whole(line.quantity) && line.quantity <= 10000,
      'Invalid SKU or quantity');
    requireProof(!seen.has(line.sku), 'Duplicate SKU in request');
    seen.add(line.sku);
    const product = products.get(line.sku);
    requireProof(product && product.discoverable === true &&
      Array.isArray(product.eligibleAccountIds) &&
      product.eligibleAccountIds.includes(account.accountId),
      'Product is not eligible for this customer');
    return Object.freeze({
      sku: line.sku,
      quantityRequested: line.quantity,
      productType: product.type,
      availability: safeAvailability(product),
      commercialApproval: 'pending',
      // Even reconciled stock does not release an order or regulated medicine.
      orderReleaseAllowed: false,
      regulatedMedicineReleaseAllowed: false
    });
  });
  // Ignore browser-supplied price, customer ID, credit, stock and tax fields.
  // A subsequent privileged server flow must re-evaluate every commercial,
  // stock, regulatory and finance gate against current authoritative evidence.
  return Object.freeze({
    requestId,
    accountId: account.accountId,
    actorId: actor.actorId,
    channel,
    requestKind: 'non_binding_b2b_assisted_request',
    status: 'commercial_and_regulatory_review_required',
    lines: Object.freeze(lines),
    orderCreated: false,
    stockReserved: false,
    paymentCollected: false,
    dispatchAuthorised: false,
    customerCommunicationSent: false
  });
}
export function customerSafeAssistedRequestView(request) {
  requireProof(request?.requestKind === 'non_binding_b2b_assisted_request' &&
    validRef(request.accountId) && validRef(request.requestId) &&
    Array.isArray(request.lines), 'Invalid assisted request');
  return Object.freeze({
    requestId: request.requestId,
    status: request.status,
    kind: request.requestKind,
    lines: request.lines.map(line => ({
      sku: line.sku, quantityRequested: line.quantity,
      availability: line.availability
    })),
    bindingOrder: false,
    // Does not reveal employee identity, caller proof, other customers or prices.
    orderCreated: false
  });
}
