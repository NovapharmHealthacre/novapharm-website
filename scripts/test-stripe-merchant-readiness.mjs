import assert from "node:assert/strict";
import test from "node:test";
import { checkStripeMerchantReadiness } from "../src/core/payments/stripe-merchant-readiness.mjs";

const account = {
  id: "acct_123456789", object: "account", charges_enabled: true, payouts_enabled: true,
  details_submitted: true, capabilities: { card_payments: "active" },
  requirements: { currently_due: [], past_due: [], pending_verification: [], disabled_reason: null }
};
const credentials = { mode: "live", secretKey: "sk_live_fixture_only_dummy_string" };

test("verified activation requires live account capability, not a publishable key", async () => {
  const fetchImpl = async (url, opts) => {
    assert.equal(url, "https://api.stripe.com/v1/account");
    assert.match(opts.headers.Authorization, /^Bearer sk_live_/);
    return { ok: true, json: async () => account };
  };
  const ready = await checkStripeMerchantReadiness({ ...credentials, fetchImpl });
  assert.equal(ready.technicalMerchantReady, true);
  assert.equal(ready.chargesEnabled, true);
  assert.equal(ready.payoutsEnabled, true);
  assert.equal(ready.missingRequirementsCount, 0);
  assert.equal(JSON.stringify(ready).includes(credentials.secretKey), false);
  for (const secretKey of ["pk_live_fakekey123456789", "sk_test_fakekey123456789", ""]) {
    await assert.rejects(checkStripeMerchantReadiness({ ...credentials, secretKey, fetchImpl }), /verify/);
  }
});
test("pending KYC, disabled charges, payouts and card capability block readiness", async () => {
  const options = [
    { requirements: { ...account.requirements, currently_due: ["representative.verification.document"] } },
    { requirements: { ...account.requirements, pending_verification: ["representative.verification.document"] } },
    { requirements: { ...account.requirements, disabled_reason: "requirements.past_due" } },
    { charges_enabled: false },
    { payouts_enabled: false },
    { details_submitted: false },
    { capabilities: { card_payments: "pending" } }
  ];
  for (const change of options) {
    const out = await checkStripeMerchantReadiness({ ...credentials, fetchImpl: async () => ({
      ok: true, json: async () => ({ ...account, ...change })
    }) });
    assert.equal(out.technicalMerchantReady, false);
  }
});
test("Standard accounts can omit card capability status; missing requirements must not pass", async () => {
  const output = await checkStripeMerchantReadiness({ ...credentials, fetchImpl: async () => ({
    ok: true, json: async () => ({ ...account, capabilities: {} })
  }) });
  assert.equal(output.technicalMerchantReady, true);
  assert.equal(output.cardCapabilityStatus, "not_reported");
  const unknown = await checkStripeMerchantReadiness({ ...credentials, fetchImpl: async () => ({
    ok: true, json: async () => ({ ...account, requirements: null })
  }) });
  assert.equal(unknown.technicalMerchantReady, false);
});
test("invalid API response, network failure or wrong object fails closed and does not leak Stripe body", async () => {
  for (const fetchImpl of [
    async () => { throw new Error("sensitive provider body"); },
    async () => ({ ok: false, json: async () => ({ message: "sensitive" }) }),
    async () => ({ ok: true, json: async () => ({ object: "customer", id: "cus_wrong" }) }),
    async () => ({ ok: true, json: async () => { throw new Error("bad json"); } })
  ]) await assert.rejects(checkStripeMerchantReadiness({ ...credentials, fetchImpl }), err => (
    err.code === "stripe_readiness_unknown" && !err.message.includes("sensitive")
  ));
});
