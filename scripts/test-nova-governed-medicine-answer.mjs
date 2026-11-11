import assert from "node:assert/strict";
import { test } from "node:test";
import { answerGovernedMedicineQuestion } from "../src/core/ai/nova-governed-medicine-answer.mjs";

const sha = "a".repeat(64);
const authority = {
  verified: true, principalId: "reviewer-1", workspaceId: "tenant_alpha",
  authorityRevision: "session-1", accessScopes: ["intelligence:research"]
};
const row = {
  id: "fda-label-1", workspaceId: "tenant_alpha", medicineId: "apixaban",
  sourceId: "fda.labels", sourceVersion: "2026-11",
  acceptanceStatus: "accepted", isSample: false, evidenceType: "observed_fact",
  provenanceSha256: sha, title: "Accepted official label metadata",
  passage: "An official product label record is registered for apixaban.",
  sourceUrl: "https://api.fda.gov/drug/label.json"
};
const grant = {
  workspaceId: "tenant_alpha", sourceId: "fda.labels", sourceVersion: "2026-11",
  status: "active", rightsRevision: "rights-1",
  allowedPurposes: ["external_ai_medicine_answer"], validFrom: "2026-01-01T00:00:00Z",
  validUntil: "2027-01-01T00:00:00Z"
};
const fixedNow = Date.parse("2026-11-11T12:00:00Z");

function harness(overrides = {}) {
  const calls = { model: 0, read: 0, rights: 0, verification: 0, audit: [], metrics: 0 };
  const options = {
    authority, medicineId: "apixaban", question: "What official label record is available?",
    clock: () => fixedNow,
    loadAcceptedEvidence: async () => { calls.read++; return [{ ...row }]; },
    resolveSourceRight: async () => { calls.rights++; return { ...grant }; },
    verifyCurrentAuthority: async () => { calls.verification++; return true; },
    recordAudit: async event => { calls.audit.push(event); return { committed: true, eventId: event.eventId }; },
    recordMetric: async event => { calls.metrics++; assert.equal(event.event, "nova_inference_preflight"); return { recorded: true }; },
    provider: {
      id: "openai-zdr",
      complete: async args => {
        calls.model++;
        assert.equal(args.sourceManifest.verifiedServerSide, true);
        assert.equal(args.sourceManifest.externalAiRightsApproved, true);
        assert.deepEqual(args.sourceManifest.sourceIds, ["fda.labels"]);
        assert.equal(args.prompt.includes("api_key="), false);
        return "The source registers an apixaban label. [source:fda-label-1]";
      }
    }
  };
  return { calls, options: { ...options, ...overrides } };
}

test("NOVA returns only review-labelled sourced drafts with server-owned citations and no body in audit", async () => {
  const { calls, options } = harness();
  const result = await answerGovernedMedicineQuestion(options);
  assert.equal(result.status, "draft_requires_human_review");
  assert.equal(result.productionCertified, false);
  assert.equal(result.controls.productionWriteAllowed, false);
  assert.deepEqual(result.citations.map(c => c.recordId), ["fda-label-1"]);
  assert.equal(result.citations[0].sourceUrl, row.sourceUrl);
  assert.equal(calls.model, 1);
  assert.equal(calls.metrics, 1);
  assert.equal(calls.audit.length, 2);
  assert.equal(calls.verification, 3);
  for (const audit of calls.audit) {
    assert.equal("question" in audit, false);
    assert.equal("prompt" in audit, false);
    assert.equal("passage" in audit, false);
    assert.equal("answer" in audit, false);
  }
});

test("missing records abstain without model egress", async () => {
  const { calls, options } = harness({ loadAcceptedEvidence: async () => [] });
  await assert.rejects(() => answerGovernedMedicineQuestion(options), error => error.code === "nova_no_accepted_evidence");
  assert.equal(calls.model, 0);
});

test("cross-tenant, unaccepted, sample or malformed provenance cannot reach a model", async () => {
  for (const altered of [
    { workspaceId: "tenant_beta" }, { acceptanceStatus: "staged" },
    { isSample: true }, { provenanceSha256: "invalid" }, { sourceUrl: "http://localhost/secret" }
  ]) {
    const { calls, options } = harness({ loadAcceptedEvidence: async () => [{ ...row, ...altered }] });
    await assert.rejects(() => answerGovernedMedicineQuestion(options), error => error.code === "nova_evidence_not_accepted");
    assert.equal(calls.model, 0);
  }
});

test("explicit, current external-AI rights are mandatory for every source", async () => {
  for (const altered of [
    { status: "pending" }, { allowedPurposes: ["internal_evidence_graph"] },
    { workspaceId: "tenant_beta" }, { validUntil: "2026-01-01T00:00:00Z" },
    { sourceVersion: "old-version" }
  ]) {
    const { calls, options } = harness({ resolveSourceRight: async () => ({ ...grant, ...altered }) });
    await assert.rejects(() => answerGovernedMedicineQuestion(options), error => error.code === "nova_source_rights_not_approved");
    assert.equal(calls.model, 0);
  }
});

test("revoked session is blocked before the model and remains blocked after inference", async () => {
  const before = harness({ verifyCurrentAuthority: async () => false });
  await assert.rejects(() => answerGovernedMedicineQuestion(before.options), error => error.code === "nova_authority_revoked");
  assert.equal(before.calls.model, 0);
  const after = harness({ verifyCurrentAuthority: async () => {
    after.calls.verification++;
    return after.calls.verification < 3;
  } });
  await assert.rejects(() => answerGovernedMedicineQuestion(after.options), error => error.code === "nova_authority_revoked");
  assert.equal(after.calls.model, 1);
});

test("an unavailable audit or monitor prevents all outbound AI requests", async () => {
  const noAudit = harness({ recordAudit: async () => ({ committed: false }) });
  await assert.rejects(() => answerGovernedMedicineQuestion(noAudit.options), error => error.code === "nova_audit_unavailable");
  assert.equal(noAudit.calls.model, 0);
  const noMetric = harness({ recordMetric: async () => ({ recorded: false }) });
  await assert.rejects(() => answerGovernedMedicineQuestion(noMetric.options), error => error.code === "nova_monitoring_unavailable");
  assert.equal(noMetric.calls.model, 0);
});

test("credentials, personal identifiers and medical treatment prompts are blocked before egress", async () => {
  for (const question of ["What dose should a patient take?", "Include api_key=secret-value", "Explain patient ID 1234"]) {
    const { calls, options } = harness({ question });
    await assert.rejects(() => answerGovernedMedicineQuestion(options));
    assert.equal(calls.model, 0);
  }
  const e = harness({ loadAcceptedEvidence: async () => [{ ...row, passage: "Contact private.person@example.org" }] });
  await assert.rejects(() => answerGovernedMedicineQuestion(e.options), error => error.code === "nova_evidence_not_accepted");
  assert.equal(e.calls.model, 0);
});

test("model hallucinated IDs and uncited statements cannot be returned", async () => {
  for (const answer of [
    "A claim with no reference.",
    "A claim. [source:invented]",
    "Valid citation. [source:fda-label-1]\nUncited extra claim.",
    "A claim. [source:wrong] [source:fda-label-1]"
  ]) {
    const { options } = harness({ provider: { id: "openai-zdr", complete: async () => answer } });
    await assert.rejects(() => answerGovernedMedicineQuestion(options), error => error.code === "nova_answer_unverifiable");
  }
});

test("unapproved or absent provider cannot be invoked", async () => {
  const { calls, options } = harness({ provider: { id: "none", complete: async () => "No" } });
  await assert.rejects(() => answerGovernedMedicineQuestion(options), error => error.code === "nova_production_dependencies_missing");
  assert.equal(calls.model, 0);
});
