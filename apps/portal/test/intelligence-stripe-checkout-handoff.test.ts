import assert from "node:assert/strict";
import test from "node:test";
import { requestIntelligenceSubscriptionCheckout } from "../lib/intelligence-stripe-checkout-handoff";

const jwt = "e".repeat(180);
const approvedUrl = "https://checkout.stripe.com/c/pay/cs_live_mock";

test("private checkout handoff is OFF by default and cannot contact an upstream service", async () => {
  let called = false;
  const result = await requestIntelligenceSubscriptionCheckout({
    idToken: jwt, plan: "starter", cycle: "monthly", enabled: false,
    fetchImpl: async () => { called = true; throw Error("must never be called"); },
  });
  assert.equal(result, null);
  assert.equal(called, false);
});

test("only signed-choice plans are forwarded to the fixed private checkout endpoint", async () => {
  let calls = 0;
  const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    calls += 1;
    assert.equal(String(input), "https://intelligence.novapharmhealthcare.com/customer/subscription/checkout");
    assert.ok(init, "The checkout request must have fetch init options");
    assert.ok(init.headers, "The checkout request must include authorization headers");
    assert.equal(init.method, "POST");
    assert.equal((init.headers as Record<string,string>)["Origin"], "https://intelligence.novapharmhealthcare.com");
    assert.equal((init.headers as Record<string,string>)["Authorization"], "Bearer " + jwt);
    assert.deepEqual(JSON.parse(String(init.body)), { plan: "starter", cycle: "monthly" });
    assert.equal(init.redirect, "error");
    return Response.json({ ok: true, code: "checkout_session_created_no_entitlement", checkoutUrl: approvedUrl }, { status: 200 });
  };
  const result = await requestIntelligenceSubscriptionCheckout({
    idToken: jwt, plan: "starter", cycle: "monthly", enabled: true, fetchImpl,
  });
  assert.equal(result, approvedUrl);
  assert.equal(calls, 1);
});

test("invalid selections, denied upstream, and untrusted Stripe origins fail closed", async () => {
  let calls = 0;
  const counting = async (): Promise<Response> => { calls++; throw Error("not called"); };
  for (const [plan, cycle] of [["enterprise","monthly"],["trial","monthly"],["starter","weekly"],["professional","random"],[null,"monthly"],["starter",null]]) {
    assert.equal(await requestIntelligenceSubscriptionCheckout({
      idToken: jwt, plan, cycle, enabled: true, fetchImpl: counting,
    }), null);
  }
  assert.equal(calls, 0);
  for (const response of [
    Response.json({ ok:false, code:"subscription_checkout_not_released" }, { status:503 }),
    Response.json({ ok:true, code:"checkout_session_created_no_entitlement", checkoutUrl:"https://evil.example/c/pay/cs_live_mock" }),
    Response.json({ ok:true, code:"checkout_session_created_no_entitlement", checkoutUrl:"https://checkout.stripe.com.evil.example/c/pay/cs_live_mock" }),
    Response.json({ ok:true, code:"checkout_session_created_no_entitlement", checkoutUrl:"http://checkout.stripe.com/c/pay/cs_live_mock" }),
    Response.json({ ok:true, code:"checkout_session_created_no_entitlement", checkoutUrl:"https://checkout.stripe.com/c/pay/cs_test_mock" }),
    Response.json({ ok:true, code:"checkout_session_created_no_entitlement", checkoutUrl:"https://checkout.stripe.com/c/pay/cs_live_mock?return=evil" }),
    Response.json({ ok:true, code:"other", checkoutUrl:approvedUrl }),
    new Response("not-json", { status:200, headers:{ "content-type":"text/plain" } }),
  ]) {
    assert.equal(await requestIntelligenceSubscriptionCheckout({
      idToken: jwt, plan:"professional", cycle:"annual", enabled:true, fetchImpl:async()=>response,
    }), null);
  }
});
