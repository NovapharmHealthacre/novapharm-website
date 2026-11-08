import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { beginAuthorisedCheckout, acceptSignedCheckoutWebhook } from "../src/core/payments/authorised-checkout-flow.mjs";

const origin="https://portal.novapharmhealthcare.com";
const identity={authenticated:true,verifiedEmail:true,tradingApproved:true,role:"customer",
  customerId:"customer_valid_123",subject:"cognito_valid_456"};
const activation={enabled:true,mode:"test",
  secretKey:"sk_test_synthetic_only_for_contracts",webhookSecret:"whsec_synthetic_for_contracts"};
function order(){return {
  orderId:"order_valid_123",customerId:identity.customerId,
  approvedForPayment:true,stockReserved:true,taxAndShippingVerified:true,
  quoteVersion:"quote_valid_123",expiresAtMs:Date.now()+600000,
  currency:"GBP",destinationCountry:"GB",
  totalGrossMinor:1200,lines:[{name:"Synthetic approved supplement",quantity:1,grossMinor:1200}]
};}
function fakeStore() {
  const state={attempts:[],sessions:[],events:[],seen:new Set()};
  const store={
    async loadApprovedOrderForCustomer(orderId,customerId){
      return orderId==="order_valid_123" && customerId===identity.customerId?order():null;
    },
    async reservePaymentAttemptAtomically(input){
      state.attempts.push(input);
      return {id:"attempt_valid_123",...input};
    },
    async attachStripeSessionAtomically(input){state.sessions.push(input);},
    async findAttemptForStripeSession(stripeSessionId){
      return stripeSessionId==="cs_test_123abc"?{
        sessionId:"cs_test_123abc",orderId:"order_valid_123",
        paymentAttemptId:"attempt_valid_123",quoteVersion:"quote_valid_123",
        totalGrossMinor:1200,liveMode:false
      }:null;
    },
    async applyPaymentEventOnceAndEnqueue(input){
      if(state.seen.has(input.eventId))return false;
      state.seen.add(input.eventId);state.events.push(input);return true;
    }
  };return {store,state};
}
const fakeStripe=async(url,request)=>{
  assert.equal(url,"https://api.stripe.com/v1/checkout/sessions");
  assert.equal(new URLSearchParams(request.body).get("client_reference_id"),"order_valid_123");
  return {ok:true,json:async()=>({id:"cs_test_123abc",url:"https://checkout.stripe.com/c/pay/cs_test_123abc",
    mode:"payment",livemode:false})};
};
function paymentEvent(rawStatus="paid",amount=1200){
  return {id:"evt_synthetic1234",type:"checkout.session.completed",created:Date.now()/1000,
    data:{object:{id:"cs_test_123abc",client_reference_id:"order_valid_123",currency:"gbp",
      amount_total:amount,payment_status:rawStatus,livemode:false,
      metadata:{payment_attempt_id:"attempt_valid_123",quote_version:"quote_valid_123"}}}};
}
function sign(payload) {
  const nowMs=Date.now(),t=Math.floor(nowMs/1000),rawBody=JSON.stringify(payload);
  return {nowMs,rawBody,signatureHeader:"t="+t+",v1="+
    createHmac("sha256",activation.webhookSecret).update(t+"."+rawBody).digest("hex")};
}
test("approved customer can initiate exactly the server-held order with persisted provider session",async()=>{
  const {store,state}=fakeStore();
  const checkout=await beginAuthorisedCheckout({
    identity,orderId:"order_valid_123",store,activation,publicOrigin:origin,fetchImpl:fakeStripe
  });
  assert.equal(checkout.checkoutSessionId,"cs_test_123abc");
  assert.equal(state.attempts.length,1);
  assert.equal(state.sessions.length,1);
  assert.equal(state.attempts[0].customerId,identity.customerId);
  assert.equal(state.sessions[0].stripeSessionId,checkout.checkoutSessionId);
});
test("unapproved/cross-tenant/logged-out customers never reach payment gateway",async()=>{
  const changes=[
    {authenticated:false},{verifiedEmail:false},{tradingApproved:false},{role:"employee"},
    {customerId:"another_tenant_123"},{subject:""},
  ];
  for(const part of changes){
    const {store,state}=fakeStore();
    await assert.rejects(beginAuthorisedCheckout({
      identity:{...identity,...part},orderId:"order_valid_123",
      store,activation,publicOrigin:origin,fetchImpl:async()=>{throw new Error("provider incorrectly called");}
    }));
    assert.equal(state.attempts.length,0);
  }
  const {store}=fakeStore();
  await assert.rejects(beginAuthorisedCheckout({identity,orderId:"../admin",
    store,activation,publicOrigin:origin,fetchImpl:fakeStripe}),/not available/);
});
test("only signed provider paid session is posted once to server order ledger",async()=>{
  const {store,state}=fakeStore();
  const payload=paymentEvent();
  const event=sign(payload);
  const one=await acceptSignedCheckoutWebhook({...event,webhookSecret:activation.webhookSecret,store});
  const replay=await acceptSignedCheckoutWebhook({...event,webhookSecret:activation.webhookSecret,store});
  assert.equal(one.applied,true);
  assert.equal(replay.applied,false);
  assert.equal(state.events.length,1);
  assert.equal(state.events[0].action,"record_verified_payment");
  await assert.rejects(acceptSignedCheckoutWebhook({...sign(paymentEvent("paid",100)),
    webhookSecret:activation.webhookSecret,store}),/match/);
  await assert.rejects(acceptSignedCheckoutWebhook({...event,
    signatureHeader:event.signatureHeader.replace(/.$/,"0"),
    webhookSecret:activation.webhookSecret,store}),/signature/);
});
test("cannot return Stripe checkout URL if durable session persistence fails",async()=>{
  const {store}=fakeStore();
  store.attachStripeSessionAtomically=async()=>{throw new Error("durability unavailable");};
  await assert.rejects(beginAuthorisedCheckout({
    identity,orderId:"order_valid_123",store,activation,publicOrigin:origin,fetchImpl:fakeStripe
  }),/durability unavailable/);
});
