import test from "node:test";
import assert from "node:assert/strict";
import { checkFreePlan } from "./check-free-plan.mjs";
const account = "123456789012";
const valid = {
  accountId: account,
  accountPlanType: "FREE",
  accountPlanStatus: "ACTIVE",
  accountPlanRemainingCredits: { amount: 80, unit: "USD" },
  accountPlanExpirationDate: "2027-03-01T00:00:00Z"
};
const options = { expectedAccount: account, now: new Date("2026-11-06T00:00:00Z") };
test("active FREE trial with reserve and remaining time is allowed for consideration only", () => {
  assert.equal(checkFreePlan(valid, options).accountPlanType, "FREE");
});
test("paid plan rejected even with promotional credits", () => {
  assert.throws(() => checkFreePlan({ ...valid, accountPlanType: "PAID" }, options), /active FREE account plan/);
});
test("expired plan rejected", () => {
  assert.throws(() => checkFreePlan({ ...valid, accountPlanStatus: "EXPIRED" }, options), /active FREE account plan/);
});
test("wrong AWS project rejected", () => {
  assert.throws(() => checkFreePlan({ ...valid, accountId: "999999999999" }, options), /does not match/);
});
test("insufficient credits rejected", () => {
  assert.throws(() => checkFreePlan({ ...valid, accountPlanRemainingCredits: { amount: 10, unit: "USD" } }, options), /below/);
});
test("near expiry rejected", () => {
  assert.throws(() => checkFreePlan({ ...valid, accountPlanExpirationDate: "2026-11-09T00:00:00Z" }, options), /expires/);
});
test("missing credit metadata rejected", () => {
  assert.throws(() => checkFreePlan({ ...valid, accountPlanRemainingCredits: null }, options), /missing/);
});
test("missing account ID rejected", () => {
  assert.throws(() => checkFreePlan(valid, { ...options, expectedAccount: undefined }), /account ID/);
});
test("invalid safety thresholds rejected", () => {
  assert.throws(() => checkFreePlan(valid, { ...options, minimumCreditsUsd: -10 }), /positive/);
});
