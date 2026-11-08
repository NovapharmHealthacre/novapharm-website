import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";
import test from "node:test";
import { calculateMarginQuote } from "../src/core/payments/commerce-margin-policy.mjs";
import { buildApprovedCheckoutParameters, createStripeHostedCheckout,
  verifyStripeWebhook, reconcileStripeCheckoutEvent } from "../src/core/payments/stripe-checkout.mjs";
import { reconcileStripeRefundEvent } from "../src/core/payments/stripe-refund-policy.mjs";

const eventSecret="whsec_synthetic_for_local_tests_only";
const nowMs=Date.now();
function signed(event, timestampMs = nowMs) {
  const rawBody=JSON.stringify(event), t=String(Math.floor(timestampMs/1000));
  const signatureHeader="t="+t+",v1="+createHmac("sha256",eventSecret).update(t+"."+rawBody).digest("hex");
  return verifyStripeWebhook({rawBody,signatureHeader,webhookSecret:eventSecret,nowMs:timestampMs});
}
test("synthetic UK quote to hosted checkout, verified payment, refund and exactly-once ledger",async()=>{
  const quote=calculateMarginQuote({
    nowMs,
    destinationCountry:"GB",
    approvedCostLines:[{sku:"NUT-UK-VD3-T120",name:"Synthetic Vitamin D3",quantity:2,
      landedUnitCostMinor:1000,sourceApproved:true,costVersion:"synthetic-r1",
      commerciallyEligible:true,fulfilmentMode:"ready_stock",availableToPromise:2}],
    deliveryQuote:{currency:"GBP",destinationCountry:"GB",providerApproval:true,
      expiresAtMs:nowMs+600000,reference:"synthetic-freight-123",costMinor:300,packingMinor:100},
    taxAssessment:{currency:"GBP",destinationCountry:"GB",confirmed:true,expiresAtMs:nowMs+600000,
      jurisdictionBasis:"Synthetic UK tax review only, not a legal determination",
      reference:"synthetic-tax-123",netMinor:3201,lineTaxMinor:[533,107],totalTaxMinor:640}
  });
  assert.equal(quote.grossMinor,3841);
  assert.equal(quote.status,"quote_candidate_not_payment_authorisation");
  const approvedOrder={
    orderId:"ord_synthetic_01",customerId:"cust_synthetic_01",
    paymentAttemptId:"attempt_synthetic_01",quoteVersion:"quote_synthetic_01",
    expiresAtMs:nowMs+600000,
    approvedForPayment:true,stockReserved:true,taxAndShippingVerified:true,
    currency:quote.currency,destinationCountry:quote.destinationCountry,totalGrossMinor:quote.grossMinor,
    lines:quote.lines
  };
  const params=buildApprovedCheckoutParameters({
    approvedOrder,publicOrigin:"https://portal.novapharmhealthcare.com"
  });
  assert.equal(params.get("line_items[0][price_data][unit_amount]"),"3200");
  assert.equal(params.get("line_items[1][price_data][unit_amount]"),"641");
  const fakeStripe = async (url, request)=>{
    assert.equal(url,"https://api.stripe.com/v1/checkout/sessions");
    assert.equal(new URLSearchParams(request.body).get("client_reference_id"),approvedOrder.orderId);
    return {ok:true,json:async()=>({id:"cs_test_synthetic123",mode:"payment",livemode:false,
      url:"https://checkout.stripe.com/c/pay/cs_test_synthetic123"})};
  };
  const session=await createStripeHostedCheckout({
    approvedOrder,publicOrigin:"https://portal.novapharmhealthcare.com",
    activation:{enabled:true,mode:"test",secretKey:"sk_test_synthetic_only_for_tests",webhookSecret:eventSecret},
    fetchImpl:fakeStripe
  });
  const orderPaid=signed({id:"evt_syntheticpaid123",type:"checkout.session.completed",
    data:{object:{id:session.sessionId,client_reference_id:approvedOrder.orderId,
      metadata:{payment_attempt_id:approvedOrder.paymentAttemptId,quote_version:approvedOrder.quoteVersion},
      amount_total:3841,currency:"gbp",payment_status:"paid",livemode:false}}});
  const attempt={
    sessionId:session.sessionId,orderId:approvedOrder.orderId,
    paymentAttemptId:approvedOrder.paymentAttemptId,quoteVersion:approvedOrder.quoteVersion,
    totalGrossMinor:3841,liveMode:false
  };
  assert.equal(reconcileStripeCheckoutEvent(orderPaid,attempt).action,"record_verified_payment");
  const sql=readFileSync(new URL("../src/core/payments/payment-ledger-reference.sql",import.meta.url),"utf8");
  const db=new DatabaseSync(":memory:");
  db.exec(sql);
  db.prepare(\`INSERT INTO payment_attempts
    (id,order_id,customer_id,quote_version,amount_minor,currency,destination_country,
      livemode,state,stripe_session_id,reserved_stock_reference,quote_expires_at,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)\`).run(
    approvedOrder.paymentAttemptId,approvedOrder.orderId,approvedOrder.customerId,approvedOrder.quoteVersion,
    3841,"GBP","GB",0,"checkout_pending",session.sessionId,
    "synthetic-reservation-123",new Date(nowMs+600000).toISOString(),
    new Date(nowMs).toISOString(),new Date(nowMs).toISOString());
  const savePaymentEvent=()=>{
    db.prepare(\`INSERT INTO payment_provider_events
      (event_id,provider,attempt_id,event_type,received_at,state_before,state_after,processing_status,payload_sha256)
      VALUES(?,?,?,?,?,?,?,?,?)\`).run(orderPaid.id,"stripe",approvedOrder.paymentAttemptId,orderPaid.type,
      new Date(nowMs).toISOString(),"checkout_pending","paid","applied","a".repeat(64));
  };
  savePaymentEvent();
  db.prepare("UPDATE payment_attempts SET state='paid',settled_at=? WHERE id=?")
    .run(new Date(nowMs).toISOString(),approvedOrder.paymentAttemptId);
  assert.throws(savePaymentEvent,/UNIQUE/);
  assert.equal(db.prepare("SELECT state FROM payment_attempts WHERE id=?").get(approvedOrder.paymentAttemptId).state,"paid");
  const refundObject={
    object:"refund",id:"re_synthetic123",amount:1200,currency:"gbp",
    livemode:false,charge:"ch_synthetic123",payment_intent:"pi_synthetic123",status:"succeeded"
  };
  const signedRefund=signed({id:"evt_syntheticrefund123",type:"refund.updated",data:{object:refundObject}});
  const refundState=reconcileStripeRefundEvent(signedRefund,{
    orderId:approvedOrder.orderId,paymentAttemptId:approvedOrder.paymentAttemptId,
    stripeChargeId:refundObject.charge,stripePaymentIntentId:refundObject.payment_intent,
    paidAmountMinor:3841,paymentStatus:"paid",liveMode:false
  },{
    id:"refund_record_001",orderId:approvedOrder.orderId,paymentAttemptId:approvedOrder.paymentAttemptId,
    stripeRefundId:refundObject.id,amountMinor:1200,status:"pending"
  });
  assert.equal(refundState.action,"record_verified_refund");
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM payment_provider_events").get().count,1);
  db.close();
});
