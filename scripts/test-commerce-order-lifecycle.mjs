import './test-b2b-assisted-order.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {transitionOrder,orderTrackingPublicView,aggregateReconciledOrders} from '../src/commerce/order-lifecycle.mjs';
const base={orderId:'NUT-test-order',status:'stock_reserved',customerEmail:'private@example.test',customerAddress:'private',publicSellerId:'NOVAPHARM-OPERATOR'};
const event=(type,extra={})=>({id:'evt-001',type,actorId:'webhook-service',evidenceRef:'signed-stripe-receipt',...extra});
test('only verified live Stripe signatures may mark orders paid',()=>{
 const open=transitionOrder({order:base,event:event('checkout_open')});
 assert.equal(open.status,'checkout_open');
 assert.throws(()=>transitionOrder({order:open,event:event('paid',{paidAmountMinor:1000,paymentIntentId:'pi_001'})}),/verified live Stripe/);
 const paid=transitionOrder({order:open,event:event('paid',{stripeVerified:true,stripeLivemode:true,paidAmountMinor:1000,paymentIntentId:'pi_001'})});
 assert.equal(paid.status,'paid');
});
test('cannot dispatch without carrier and proof',()=>{
 const packed={...base,status:'packed'};
 assert.throws(()=>transitionOrder({order:packed,event:event('dispatched',{carrierReference:'carrier123'})}),/warehouse proof/);
 assert.equal(transitionOrder({order:packed,event:event('dispatched',{carrierReference:'carrier123',warehouseDispatchProof:'proof-123'})}).status,'dispatched');
});
test('refund does not happen on failed or pending processor response',()=>{
 const pending={...base,status:'refund_pending'};
 assert.throws(()=>transitionOrder({order:pending,event:event('refunded',{verifiedRefundId:'re_abc'})}),/verified processor/);
 assert.equal(transitionOrder({order:pending,event:event('refunded',{verifiedRefundId:'re_abc',refundSettled:true})}).status,'refunded');
});
test('tracking view redacts customer data and private payment state',()=>{
 const view=orderTrackingPublicView({...base,status:'dispatched',publicCarrierName:'UK carrier',publicTrackingNumber:'TRACK-123'});
 assert.deepEqual(Object.keys(view).sort(),['carrier','orderId','sellerId','status','trackingNumber','updatedAt'].sort());
 assert(!JSON.stringify(view).includes('private'));
});
test('NOVA only aggregates reconciled paid orders and deduplicates events',()=>{
 const facts=[
 {date:'2026-11-11',productId:'NUT-UK-TEST',paymentReconciled:true,status:'paid',units:3,netSalesMinor:6000,sourceEventId:'evt-001'},
 {date:'2026-11-11',productId:'NUT-UK-TEST',paymentReconciled:true,status:'paid',units:3,netSalesMinor:6000,sourceEventId:'evt-001'},
 {date:'2026-11-11',productId:'NUT-UK-TEST',paymentReconciled:false,status:'paid',units:10,netSalesMinor:10000,sourceEventId:'evt-002'}
 ];
 const result=aggregateReconciledOrders(facts,{date:'2026-11-11',productId:'NUT-UK-TEST'});
 assert.equal(result.orderCount,1);assert.equal(result.units,3);assert.equal(result.netSalesMinor,6000);assert.equal(result.evidenceType,'observed_fact');
});
