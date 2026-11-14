import assert from "node:assert/strict";
import test from "node:test";
import { requestIntelligenceSubscriptionCheckout } from "../lib/intelligence-stripe-checkout-handoff";

const jwt = "e".repeat(180);

test("authenticated plan selection requests only fixed server-side checkout", async () => {
  let calls = 0;
  const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    calls += 1;
    assert.equal(String(input), "https://intelligence.novapharmhealthcare.com/customer/subscription/checkout");
    assert.equal(init?.method, "POST");
    assert.equal((init?.headers as Record<string,string>)["Origin"], "https://intelligence.novapharmhealthcare.com");
    assert.equal((init?.headers as Record<string,string>)["Authorization"], "Bearer " + jwt);
    assert.deepEqual(JSON.parse(String(init?.body)), {plan:"starter",cycle:"monthly"});
    assert.equal(init?.redirect,"error");
    return Response.json({ok:true, code:"checkout_session_created_no_entitlement",
      checkoutUrl:"https://checkout.stripe.com/c/pay/cs_live_mock"}, {status:200});
  };
  const result = await requestIntelligenceSubscriptionCheckout({idToken:jwt,plan:"starter",cycle:"monthly",fetchImpl});
  assert.equal(result, "https://checkout.stripe.com/c/pay/cs_live_mock");
  assert.equal(calls,1);
});

test("invalid or unapproved selections cannot reach Stripe", async () => {
  let count = 0;
  const fetchImpl = async () => { count += 1; throw Error("should not call"); };
  for (const [plan,cycle] of [["enterprise","monthly"],["trial","monthly"],["starter","weekly"],["professional","random"],[null,"monthly"],["starter",null]]) {
    assert.equal(await requestIntelligenceSubscriptionCheckout({idToken:jwt,plan,cycle,fetchImpl:fetchImpl as typeof fetch}),null);
  }
  assert.equal(count,0);
});

test("503, fake Stripe URLs, reflected untrusted hosts and malformed upstream are all fail closed", async () => {
  for (const response of [
    Response.json({ok:false,code:"subscription_checkout_not_released"},{status:503}),
    Response.json({ok:true,code:"checkout_session_created_no_entitlement",checkoutUrl:"https://evil.test/c/pay/cs_live_fake"}),
    Response.json({ok:true,code:"checkout_session_created_no_entitlement",checkoutUrl:"https://checkout.stripe.com.evil.test/c/pay/cs_live_fake"}),
    Response.json({ok:true,code:"checkout_session_created_no_entitlement",checkoutUrl:"http://checkout.stripe.com/c/pay/cs_live_fake"}),
    Response.json({ok:true,code:"checkout_session_created_no_entitlement",checkoutUrl:"https://checkout.stripe.com/c/pay/cs_test_fake"}),
    Response.json({ok:true,code:"other",checkoutUrl:"https://checkout.stripe.com/c/pay/cs_live_fake"}),
    new Response("not-json",{status:200,headers:{"content-type":"text/plain"}}),
  ]) {
    assert.equal(await requestIntelligenceSubscriptionCheckout({idToken:jwt,plan:"professional",cycle:"annual",
      fetchImpl:async()=>response}),null);
  }
});
