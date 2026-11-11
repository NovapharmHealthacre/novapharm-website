// Payment, warehouse and return transitions are independent authorities.
// This is a pure domain contract; persisted transitions must use conditional writes.
const STATE_GRAPH=Object.freeze({
  created:['stock_reserved','cancelled'],
  stock_reserved:['checkout_open','cancelled','reservation_expired'],
  checkout_open:['paid','payment_failed','reservation_expired'],
  paid:['pick_ready','refund_pending'],
  pick_ready:['picked','refund_pending'],
  picked:['packed','refund_pending'],
  packed:['dispatched','refund_pending'],
  dispatched:['delivered','return_requested'],
  delivered:['return_requested'],
  return_requested:['return_authorised','return_rejected'],
  return_authorised:['returned'],
  returned:['refund_pending','replacement_approved'],
  refund_pending:['refunded','refund_failed'],
  payment_failed:['cancelled'],
  reservation_expired:['cancelled'],
  refund_failed:['refund_pending'],
  return_rejected:[],
  replacement_approved:[],
  refunded:[],
  cancelled:[]
});
const money=n=>Number.isSafeInteger(n)&&n>=0;
export function transitionOrder({order,event}) {
  if(!order||!STATE_GRAPH[order.status])throw new Error('Unknown order state');
  if(!event||!event.id||!event.type||!event.actorId||!event.evidenceRef)throw new Error('Transition requires identity and evidence');
  if(!STATE_GRAPH[order.status].includes(event.type))throw new Error('Order state transition not permitted');
  const to=event.type;
  if(to==='paid' && !(event.stripeVerified===true&&event.stripeLivemode===true&&event.paymentIntentId&&money(event.paidAmountMinor)))throw new Error('Paid requires verified live Stripe event');
  if(to==='dispatched' && !(event.carrierReference&&event.warehouseDispatchProof))throw new Error('Dispatch requires carrier and warehouse proof');
  if(to==='delivered' && !event.deliveryProofRef)throw new Error('Delivered requires delivery proof');
  if(to==='refunded' && !(event.verifiedRefundId&&event.refundSettled===true))throw new Error('Refund requires verified processor settlement');
  if(to==='stock_reserved' && !(event.reservationId&&event.reservationCommitVerified===true))throw new Error('Stock reservation must be committed atomically');
  if(to==='return_authorised' && !event.returnAuthorisationId)throw new Error('Return authorisation is missing');
  if(to==='returned' && !event.returnInspectionId)throw new Error('Returned goods require inspection evidence');
  return Object.freeze({...order,status:to,statusChangedAt:event.occurredAt||null,lastTransition:{eventId:event.id,actorId:event.actorId,evidenceRef:event.evidenceRef,type:to}});
}
export function orderTrackingPublicView(order) {
  if(!order||!STATE_GRAPH[order.status])throw new Error('Unknown order state');
  return Object.freeze({orderId:order.orderId??null,status:order.status,updatedAt:order.statusChangedAt??null,
    carrier:order.status==='dispatched'||order.status==='delivered'?order.publicCarrierName??null:null,
    trackingNumber:order.status==='dispatched'||order.status==='delivered'?order.publicTrackingNumber??null:null,
    // Never disclose customer addresses, private prices, merchant payouts or payment identifiers.
    sellerId:order.publicSellerId??null});
}
export function aggregateReconciledOrders(orders,{date,productId}) {
  const seen=new Set();let orderCount=0,units=0,netSalesMinor=0;
  const sourceIds=[];
  for(const order of orders){
    if(order.productId!==productId||order.date!==date||order.paymentReconciled!==true||!['paid','pick_ready','picked','packed','dispatched','delivered'].includes(order.status))continue;
    if(!order.sourceEventId||seen.has(order.sourceEventId))continue;
    if(!money(order.units)||!money(order.netSalesMinor))throw new Error('Unsafe commerce observation');
    seen.add(order.sourceEventId);
    orderCount++;units+=order.units;netSalesMinor+=order.netSalesMinor;sourceIds.push(order.sourceEventId);
  }
  if(!money(units)||!money(netSalesMinor))throw new Error('Aggregate overflows integer units');
  return {date,productId,orderCount,units,netSalesMinor,sourceIds,source:'reconciled_commerce_orders',evidenceType:'observed_fact',forecast:false};
}
