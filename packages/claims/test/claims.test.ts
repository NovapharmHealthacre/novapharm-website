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

test("owner-approved leadership titles remain distinct from regulated documentary evidence", () => {
  const title = claimById("leadership.nishita-current-title");
  assert.match(title.statement, /Chief Technology Officer and Responsible Person/);
  assert.match(title.statement, /distinct regulated appointment/);
  assert.equal(evaluateClaim(title, reviewDate).publishable, true);

  const appointmentEvidence = claimById("regulatory.responsible-person-appointment");
  assert.equal(appointmentEvidence.publication, "hold");
  assert.equal(appointmentEvidence.evidence, "pending");
});

test("Prabhakar's executive title remains separate from governance facts", () => {
  const claim = claimById("leadership.prabhakar-current-title");
  assert.match(claim.statement, /Chief Operating Officer/);
  assert.match(claim.statement, /separate governance facts/);
});

test("expired evidence fails closed", () => {
  const claim = claimById("company.regulated-wholesale-authorisation-boundary");
  assert.equal(evaluateClaim(claim, new Date("2027-01-01T00:00:00Z")).publishable, false);
});

test("operating status distinguishes active business from authorisation-dependent wholesale supply", () => {
  const company = claimById("company.regulated-wholesale-authorisation-boundary");
  assert.match(company.statement, /active UK company/i);
  assert.match(company.statement, /Regulated wholesale supply has not commenced/i);

  const logistics = claimById("logistics.polar-speed-contracted-infrastructure");
  assert.match(logistics.statement, /contracted logistics and warehousing/i);
  assert.match(logistics.statement, /does not attribute Polar Speed's authorisations or certificates/i);
});
