import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  SCIENCE_EVIDENCE_STAGE_IDS, SCIENCE_VALIDATION_TRACKS,
  buildScienceEvidenceDossier, assertScienceClaimReleaseAuthorized
} from "../src/core/intelligence-science-evidence-dossier.mjs";
import { workspaceCapabilityDependencies } from "../src/core/intelligence-22-workspace-readiness.mjs";

const source = JSON.parse(readFileSync(
  new URL("../docs/intelligence/openai-science-methods-20261118.json", import.meta.url), "utf8"
));
const researchRef = "research:" + "a".repeat(64);
const artifact = "evidence:" + "b".repeat(64);

test("one immutable evidence lifecycle applies to every published research method and original discovery index", () => {
  assert.equal(source.methods.length, 9);
  assert.deepEqual(SCIENCE_EVIDENCE_STAGE_IDS, source.claimIntegrityPolicy.requiredStages);
  assert.deepEqual(SCIENCE_VALIDATION_TRACKS, source.claimIntegrityPolicy.validationTracks);
  for (const item of source.methods) {
    assert.ok(SCIENCE_VALIDATION_TRACKS.includes(item.validationTrack));
    assert.equal(item.retractionCorrectionStatus, "not_checked");
    assert.equal(item.publisherClaimVerification, "not_independently_assessed");
    for (const workspaceSlug of item.linkedWorkspaces) {
      const dossier = buildScienceEvidenceDossier({
        caseId: item.id, workspaceSlug, researchRef, artifactRefs: [artifact]
      });
      assert.equal(dossier.sourceUrl, item.sourceUrl);
      assert.equal(dossier.validationTrack, item.validationTrack);
      assert.deepEqual(dossier.artifactRefs, [artifact]);
      assert.equal(dossier.evidenceStages.length, SCIENCE_EVIDENCE_STAGE_IDS.length);
      assert.ok(dossier.evidenceStages.every((e) => e.status === "not_independently_verified"));
      assert.equal(dossier.customerPublicationAuthorized, false);
      assert.equal(dossier.independentlyVerifiedScientificClaim, false);
      assert.equal(dossier.automatedReleaseAuthorized, false);
      assert.equal(dossier.experimentalExecutionAuthorized, false);
      assert.equal(dossier.anyClinicalUseAuthorized, false);
      assert.equal(dossier.anyRegulatoryUseAuthorized, false);
      assert.equal(dossier.restrictedModelInvocationAuthorized, false);
      assert.equal(dossier.retractionOrCorrectionStatus, "not_checked");
      assert.equal(Object.isFrozen(dossier), true);
      assert.equal(Object.isFrozen(dossier.evidenceStages[0]), true);
    }
  }
});

test("a dynamic homepage or news index cannot become a scientific result", () => {
  for (const caseId of ["openai-research-index", "openai-science-newsroom"]) {
    const dossier = buildScienceEvidenceDossier({ caseId, workspaceSlug: "evidence", researchRef });
    assert.equal(dossier.sourceIsDiscoveryIndex, true);
    assert.equal(dossier.publicationOrClinicalClaimsMustAbstain, true);
    assert.equal(dossier.referencedArtifactAuthenticityVerified, false);
  }
});

test("all canonical Intelligence workspaces are eligible to report the lifecycle while no input grants release", () => {
  const slugs = Object.keys(workspaceCapabilityDependencies);
  assert.equal(slugs.length, 22);
  const referenced = new Set(source.methods.flatMap((entry) => entry.linkedWorkspaces));
  assert.ok([...referenced].every((slug) => slugs.includes(slug)));
  for (const entry of source.methods) {
    const dossier = buildScienceEvidenceDossier({
      caseId: entry.id, workspaceSlug: entry.linkedWorkspaces[0], researchRef,
      approved: true, patientRecordsConsentGranted: true, sourceRightsVerified: true,
      externalModelKeyPresent: true
    });
    assert.equal(dossier.sourceRightsStatus, "not_verified");
    assert.equal(dossier.reviewerIdentityIndependentlyValidated, false);
  }
  assert.throws(() => assertScienceClaimReleaseAuthorized({ allApproved:true }), /independent source rights/);
});

test("unknown scopes, unbounded patient-like inputs and forged evidence references fail closed", () => {
  const base = {caseId: "rare-disease-reanalysis", workspaceSlug: "evidence", researchRef};
  assert.throws(() => buildScienceEvidenceDossier({...base,caseId:"unknown"}), /canonical case/);
  assert.throws(() => buildScienceEvidenceDossier({...base,workspaceSlug:"__proto__"}), /canonical case/);
  assert.throws(() => buildScienceEvidenceDossier({...base,workspaceSlug:"pricing-reimbursement"}), /canonical case/);
  assert.throws(() => buildScienceEvidenceDossier({...base,researchRef:"name@example.com"}), /canonical case/);
  assert.throws(() => buildScienceEvidenceDossier({...base,researchRef:"research:short"}), /canonical case/);
  assert.throws(() => buildScienceEvidenceDossier({...base,artifactRefs:[artifact, artifact]}), /canonical case/);
  assert.throws(() => buildScienceEvidenceDossier({...base,artifactRefs:["evidence:patient-id"]}), /canonical case/);
  assert.throws(() => buildScienceEvidenceDossier({...base,artifactRefs:new Array(13).fill(artifact)}), /canonical case/);
  assert.throws(() => buildScienceEvidenceDossier({...base,artifactRefs:"free form"}), /canonical case/);
});

test("protected web and native Science methods display unverified publisher and correction status", () => {
  const web = readFileSync(new URL("../apps/portal/components/science-research-workspace.tsx", import.meta.url), "utf8");
  const native = readFileSync(new URL("../native/novapharm-intelligence-mobile/ScienceResearchMobile.tsx", import.meta.url), "utf8");
  assert.match(web, /entry\.retractionCorrectionStatus/);
  assert.match(web, /entry\.validationTrack/);
  assert.match(native, /entry\.retractionCorrectionStatus/);
  assert.match(web, /scienceMethods\.claimIntegrityPolicy\.requiredStages\.map/);
  assert.match(native, /scienceMethods\.claimIntegrityPolicy\.requiredStages\.map/);
  assert.match(native, /entry\.validationTrack/);
  assert.doesNotMatch(web + native, /OPENAI_API_KEY|secret_key|api\.openai\.com|fetch\(/);
});

test("native typecheck explicitly includes Science and source registries", () => {
  const config = JSON.parse(readFileSync(
    new URL("../native/novapharm-intelligence-mobile/tsconfig.json", import.meta.url), "utf8"
  ));
  assert.ok(config.include.includes("ScienceResearchMobile.tsx"));
  assert.ok(config.include.includes("../../docs/intelligence/science-research-capabilities-20261118.json"));
  assert.ok(config.include.includes("../../docs/intelligence/openai-science-methods-20261118.json"));
  assert.equal(config.compilerOptions.noEmit, true);
  assert.equal(config.compilerOptions.strict, true);
});
