import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  listScienceMethodologyReferences, planScienceMethodologyReview, scienceMethodsForWorkspace
} from "../src/core/intelligence-science-methodology.mjs";
import { workspaceCapabilityDependencies } from "../src/core/intelligence-22-workspace-readiness.mjs";

const read = (file) => readFileSync(new URL("../" + file, import.meta.url), "utf8");
const data = JSON.parse(read("docs/intelligence/openai-science-methods-20261118.json"));
const canonical = new Set(Object.keys(workspaceCapabilityDependencies));

test("all nine unique source links match reviewed URL list including two living discovery indexes", () => {
  const expected = [
    "https://openai.com/",
    "https://openai.com/index/model-disproves-discrete-geometry-conjecture/",
    "https://openai.com/index/new-result-theoretical-physics/",
    "https://openai.com/index/ai-chemist-improves-reaction/",
    "https://openai.com/index/gpt-5-lowers-protein-synthesis-cost/",
    "https://openai.com/index/gpt-5-immunology-mystery/",
    "https://openai.com/index/diagnose-rare-childhood-diseases/",
    "https://openai.com/index/using-codex-to-simulate-black-holes/",
    "https://openai.com/news/science/"
  ];
  assert.equal(data.reviewedAt, "2026-11-18");
  assert.equal(data.methods.length, 9);
  assert.equal(data.sourceCount, 9);
  assert.equal(data.scientificMethodologyCount, 7);
  assert.equal(data.discoveryIndexCount, 2);
  assert.deepEqual(new Set(data.methods.map((x) => x.sourceUrl)), new Set(expected));
  assert.equal(new Set(data.methods.map((x) => x.id)).size, 9);
  assert.equal(new Set(data.methods.map((x) => x.methodologyId)).size, 8);
  assert.equal(data.methods.filter((x) => x.sourceType === "reference_index").length, 2);
  assert.ok(data.methods.every((x) => x.sourceReviewed && x.independentNovaPharmReplication === false &&
    x.sourceRightsForAiIngestionApproved === false && x.clinicalOrCommercialUseApproved === false));
  assert.equal(data.externalEndpointsCalledByClient, false);
  assert.equal(data.patientDataProcessed, false);
});

test("every method is scoped to existing Science-evidenced modules and is presented with limits", () => {
  for (const entry of data.methods) {
    assert.ok(entry.title.length >= 6 && entry.reportedFinding.length > 25);
    assert.ok(entry.transferablePattern.length > 25 && entry.limitations.length > 25);
    assert.ok(entry.validationRequirements.length >= 2);
    assert.ok(entry.linkedWorkspaces.length >= 2);
    assert.equal(new Set(entry.linkedWorkspaces).size, entry.linkedWorkspaces.length);
    assert.ok(entry.linkedWorkspaces.every((slug) => canonical.has(slug)));
  }
  const web = read("apps/portal/components/science-research-workspace.tsx");
  const native = read("native/novapharm-intelligence-mobile/ScienceResearchMobile.tsx");
  assert.match(web, /scienceMethods\.methods\.map/);
  assert.match(native, /scienceMethods\.methods\.map/);
  assert.match(web, /entry\.limitations/);
  assert.match(native, /entry\.limitations/);
  assert.match(web, /entry\.sourceUrl/);
  assert.match(native, /openResearchReference\(entry\.id, entry\.sourceUrl\)/);
  assert.match(native, /await Linking\.openURL\(sourceUrl\)/);
  assert.match(native, /approvedReference = \/\^https:/);
  assert.match(native, /AccessibilityInfo\.announceForAccessibility\(message\)/);
  assert.doesNotMatch(native, /void Linking\.openURL\(entry\.sourceUrl\)/);
  assert.doesNotMatch(web + native, /fetch\(|axios\(|api\.openai\.com|OPENAI_API_KEY|client_secret/);
});

test("all 22 canonical workspaces receive fail-closed method-reference coverage", () => {
  const refs = listScienceMethodologyReferences();
  assert.equal(refs.length, 9);
  assert.ok(refs.every((x) => !x.productionCertified && x.sourceReviewIsNotScientificReplication));
  for (const slug of canonical) {
    const scope = scienceMethodsForWorkspace(slug);
    assert.equal(scope.workspaceSlug, slug);
    assert.equal(scope.productionCertified, false);
    assert.equal(scope.scientificResearchEvidenceAccepted, false);
    assert.equal(scope.customerPublicationApproved, false);
    assert.deepEqual(scope.referenceCaseIds, data.methods.filter((x) => x.linkedWorkspaces.includes(slug)).map((x) => x.id));
  }
  assert.throws(() => scienceMethodsForWorkspace("science-lab"), /canonical workspace/);
  assert.throws(() => scienceMethodsForWorkspace("__proto__"), /canonical workspace/);
});

test("scientific method plans reject unsupported scope and never grant model, lab, clinical or public access", () => {
  for (const entry of data.methods) {
    const result = planScienceMethodologyReview({
      caseId: entry.id, workspaceSlug: entry.linkedWorkspaces[0],
      subjectRef: "medicine-apixaban", approved: true, modelCallAuthorized: true
    });
    assert.equal(result.status, "review_planning_only");
    assert.equal(result.researchModelInvocationAuthorized, false);
    assert.equal(result.scientificClaimsIndependentlyReplicated, false);
    assert.equal(result.primaryPublisherEvidenceVerified, false);
    assert.equal(result.clinicalUseApproved, false);
    assert.equal(result.regulatoryUseApproved, false);
    assert.equal(result.labExecutionAuthorized, false);
    assert.equal(result.customerPublicationApproved, false);
    assert.equal(result.sourceAiIngestionRightsApproved, false);
    assert.equal(result.sourceReferenceUrl, entry.sourceUrl);
  }
  assert.throws(() => planScienceMethodologyReview({
    caseId: "no-such-paper", workspaceSlug: "evidence", subjectRef: "medicine-1"
  }), /canonical workspace/);
  assert.throws(() => planScienceMethodologyReview({
    caseId: "rare-disease-reanalysis", workspaceSlug: "pricing-reimbursement", subjectRef: "medicine-1"
  }), /canonical workspace/);
  assert.throws(() => planScienceMethodologyReview({
    caseId: "rare-disease-reanalysis", workspaceSlug: "evidence", subjectRef: "person identifying text"
  }), /canonical workspace/);
});
