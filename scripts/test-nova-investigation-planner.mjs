import assert from "node:assert/strict";
import test from "node:test";
import { buildNovaInvestigationPlan } from "../src/core/ai/nova-investigation-planner.mjs";

const lensIds = [
  "identity", "primary_care", "community_spend", "secondary_care", "regulatory", "supply",
  "pricing", "tenders", "geography", "forecast", "opportunity", "decision"
];
const sample = () => ({
  contract: "novapharm.intelligence.investigation-passport.v1",
  status: "investigation_only",
  decisionReady: false,
  fingerprintIsSourceAttestation: false,
  medicineId: "medicine-0123456789abcdef0123456789abcdef",
  snapshotFingerprintSha256: "a".repeat(64),
  canonicalName: "Apixaban tablets",
  privateSupplier: "SECRET_SUPPLIER_SHOULD_NOT_LEAK",
  patient_email: "patient-secret@example.com",
  lenses: lensIds.map(id => ({
    id, sourceRights: "unverified", decisionUsable: false,
    state: id === "identity" ? "identity_recorded_rights_unverified" :
      id === "primary_care" ? "records_exist_not_yet_rights_verified" :
      ["community_spend", "secondary_care", "forecast"].includes(id) ?
        "no_accepted_records_in_this_snapshot" : "not_assessed"
  }))
});

test("NOVA derives seven non-executable steps from the existing passport", () => {
  const plan = buildNovaInvestigationPlan(sample());
  assert.equal(plan.contract, "novapharm.intelligence.nova-investigation-plan.v1");
  assert.equal(plan.steps.length, 7);
  assert.equal(plan.hypotheses.length, 4);
  assert.equal(plan.status, "planning_only");
  assert.equal(plan.executionAuthorized, false);
  assert.equal(plan.decisionReady, false);
  assert.equal(plan.productionCertified, false);
  assert.equal(plan.steps.every(step => step.executionAuthorized === false && step.modelInvocationAllowed === false), true);
  assert.equal(plan.steps.find(s => s.id === "observed_market").lenses[0].observedState,
    "records_exist_not_yet_rights_verified");
  assert.equal(plan.safeguards.noAuthorityInferredFromPassport, true);
  assert.deepEqual(plan, buildNovaInvestigationPlan(sample()));
});

test("hypotheses remain falsifiable and are not asserted as observed facts", () => {
  const plan = buildNovaInvestigationPlan(sample());
  for (const hypothesis of plan.hypotheses) {
    assert.equal(hypothesis.epistemicStatus, "untested_hypothesis");
    assert.equal(hypothesis.evidenceAccepted, false);
    assert.ok(hypothesis.disconfirmingEvidence.length > 25);
  }
  assert.equal(plan.steps.find(s => s.id === "human_decision").toolBoundary, "human_approval_only");
});

test("private fields, patient identifiers and raw source material are never projected", () => {
  const plan = buildNovaInvestigationPlan(sample());
  const serialized = JSON.stringify(plan);
  assert.doesNotMatch(serialized, /SECRET_SUPPLIER|patient-secret|patient_email|privateSupplier|Apixaban tablets/);
});

test("changed snapshots and research purposes produce different deterministic plan fingerprints", () => {
  const first = buildNovaInvestigationPlan(sample());
  const second = buildNovaInvestigationPlan(sample(), { purpose: "supply_resilience" });
  const modified = sample();
  modified.lenses.find(l => l.id === "primary_care").state = "no_accepted_records_in_this_snapshot";
  const third = buildNovaInvestigationPlan(modified);
  assert.notEqual(first.planFingerprintSha256, second.planFingerprintSha256);
  assert.notEqual(first.planFingerprintSha256, third.planFingerprintSha256);
  assert.equal(first.fingerprintIsSourceAttestation, false);
});

test("forged or more permissive passports and unsupported jurisdictions fail closed", () => {
  const corruptions = [
    p => { p.contract = "fake"; },
    p => { p.status = "accepted"; },
    p => { p.decisionReady = true; },
    p => { p.medicineId = "../other-tenant"; },
    p => { p.snapshotFingerprintSha256 = "123"; },
    p => { p.fingerprintIsSourceAttestation = true; },
    p => { p.lenses.pop(); },
    p => { p.lenses[0].id = "private"; },
    p => { p.lenses[0].sourceRights = "approved"; },
    p => { p.lenses[0].decisionUsable = true; },
    p => { p.lenses[0].state = "fabricated_data"; }
  ];
  for (const mutate of corruptions) {
    const passport = sample();
    mutate(passport);
    assert.throws(() => buildNovaInvestigationPlan(passport), e => e.code === "nova_plan_input_rejected");
  }
  assert.throws(() => buildNovaInvestigationPlan(sample(), { jurisdiction: "US" }), e => e.statusCode === 400);
  assert.throws(() => buildNovaInvestigationPlan(sample(), { purpose: "patient_diagnosis" }), e => e.statusCode === 400);
});
