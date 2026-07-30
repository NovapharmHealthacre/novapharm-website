import assert from "node:assert/strict";
import test from "node:test";
import { claimById, claimRegistry, evaluateClaim } from "../src/index.ts";

const reviewDate = new Date("2026-07-30T12:00:00Z");

test("approved evidence-bounded claims remain publishable", () => {
  for (const claim of claimRegistry.filter((candidate) => candidate.publication === "approved")) {
    assert.equal(evaluateClaim(claim, reviewDate).publishable, true, claim.id);
  }
});

test("unverified current regulated appointments are held", () => {
  const decision = evaluateClaim(claimById("regulatory.responsible-person-appointment"), reviewDate);
  assert.equal(decision.publishable, false);
  assert.match(decision.reason, /Publication state|verified evidence/);
});

test("expired evidence fails closed", () => {
  const claim = claimById("company.pre-operational-wholesale");
  assert.equal(evaluateClaim(claim, new Date("2027-01-01T00:00:00Z")).publishable, false);
});
