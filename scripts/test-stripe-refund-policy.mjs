import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { verifyStripeWebhook } from "../src/core/payments/stripe-checkout.mjs";
import { reconcileStripeRefundEvent } from "../src/core/payments/stripe-refund-policy.mjs";

const attempt = {
  orderId:"order_test_001",paymentAttemptId:"attempt_test_001",
  paidAmountMinor:3841,paymentStatus:"paid",liveMode:false,
  stripeChargeId:"ch_test_123",stripePaymentIntentId:"pi_test_456"
};
const storedRefund = {
  id:"refund_request_001",orderId:attempt.orderId,paymentAttemptId:attempt.paymentAttemptId,
  stripeRefundId:"re_test_001",amountMinor:1200,status:"pending"
};
const refund = {
  object:"refund",id:storedRefund.stripeRefundId,amount:1200,currency:"gbp",
  livemode:false,charge:attempt.stripeChargeId,payment_intent:attempt.stripePaymentIntentId,
  status:"succeeded"
};
test("only a cryptographically verified, paid and exact refund event may reconcile",() => {
  const nowMs=Date.parse("2026-11-08T12:00:00Z");
  const timestamp=Math.floor(nowMs/1000);
  const secret="whsec_local_test_12345";
  const rawBody=JSON.stringify({id:"evt_ref123123",type:"refund.updated",data:{object:refund}});
  const signatureHeader="t="+timestamp+",v1="+createHmac("sha256",secret).update(timestamp+"."+rawBody).digest("hex");
  const event=verifyStripeWebhook({rawBody,signatureHeader,webhookSecret:secret,nowMs});
  assert.equal(reconcileStripeRefundEvent(event,attempt,storedRefund).action,"record_verified_refund");
  assert.throws(() => verifyStripeWebhook({rawBody:rawBody+" ",signatureHeader,webhookSecret:secret,nowMs}));
  assert.throws(() => reconcileStripeRefundEvent(event,attempt,{...storedRefund,amountMinor:100}));
  assert.throws(() => reconcileStripeRefundEvent(event,{...attempt,liveMode:true},storedRefund));
  assert.throws(() => reconcileStripeRefundEvent(event,{...attempt,stripeChargeId:"ch_different",stripePaymentIntentId:"pi_different"},storedRefund));
  assert.throws(() => reconcileStripeRefundEvent(event,{...attempt,paymentStatus:"pending"},storedRefund));
  assert.throws(() => reconcileStripeRefundEvent(event,attempt,{...storedRefund,orderId:"someone_else"}));
});
test("refund pending/failed are not settled and out-of-order updates cannot undo succeeded",() => {
  const ev=(status,type="refund.updated")=>({id:"evt_test456",type,data:{object:{...refund,status}}});
  assert.equal(reconcileStripeRefundEvent(ev("pending"),attempt,storedRefund).action,"record_refund_pending");
  assert.equal(reconcileStripeRefundEvent(ev("failed"),attempt,storedRefund).action,"flag_refund_failure");
  assert.equal(reconcileStripeRefundEvent(ev("succeeded"),attempt,{...storedRefund,status:"succeeded"}).action,"record_verified_refund");
  assert.equal(reconcileStripeRefundEvent(ev("pending"),attempt,{...storedRefund,status:"succeeded"}).action,"ignore_out_of_order_event");
  assert.equal(reconcileStripeRefundEvent(ev("succeeded","checkout.session.completed"),attempt,storedRefund).action,"ignore");
});
