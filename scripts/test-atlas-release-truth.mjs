import assert from 'node:assert/strict';
import test from 'node:test';
import { assessAtlasReleaseTruth } from '../src/data/atlas-release-truth.mjs';

const observed = {
  production: {
    projectId: '6af4010b0ca9668f51d9e058', cluster: 'npi-bootstrap',
    region: 'EU_NORTH_1', provider: 'AWS', state: 'IDLE', paused: false,
    ipAccessListEntries: 0,
    collections: ['npi_evidence_manifests','npi_source_rights','npi_audit_events',
      'npi_medicine_evidence','npi_medicine_identity','npi_ingestion_runs','npi_source_registry'],
    previewCollections: ['npi_customer_ownership_preview','npi_subscription_entitlements_preview',
      'npi_audit_preview','npi_medicine_evidence_preview','npi_ingestion_runs_preview',
      'npi_source_registry_preview','npi_source_rights_preview','npi_billing_events_preview'],
  },
  staging: { projectId: '6aede4d2bedcc3f04ecc6eb5', cluster: 'novapharm-staging',
    region: 'EU_NORTH_1', state: 'IDLE',
    collections: ['nova_medicine_evidence_staging','contact_receipts_synthetic'] },
  aws: { approvedFixedEgress: false, tlsProbeFromApplicationRuntime: false,
    intelligenceProductionRunningTasks: 0, applicationUsesAtlas: false },
  medicines: { productionMedicineIdentityRows: 0, productionMedicineEvidenceRows: 0,
    provenanceManifests: 0, acceptedIngestionRuns: 0, activeRightsGrants: 0 },
  commerce: { catalogueProducts: 392, checkoutApprovedOffers: 0,
    physicallyVerifiedStockPositions: 0 },
};

test('live cluster and schema do not imply a production-ready database', () => {
  const result = assessAtlasReleaseTruth(observed);
  assert.equal(result.sections.foundation.satisfied, 3);
  assert.equal(result.readyForFormalReleaseReview, false);
  assert.equal(result.productionAccepted, false);
  assert.deepEqual(result.blockedBy.slice(0,2), ['restricted-network','production-runtime']);
});
test('unknown or malformed evidence fails closed', () => {
  for (const bad of [null, [], 'ready', true]) {
    assert.throws(() => assessAtlasReleaseTruth(bad), TypeError);
  }
  assert.equal(assessAtlasReleaseTruth({success:true}).gates.every(g=>!g.passed), true);
});
test('high counts cannot compensate for pending source rights or missing customer sessions', () => {
  const result = assessAtlasReleaseTruth({...observed, medicines: {
    productionMedicineIdentityRows: 1000, productionMedicineEvidenceRows: 1000,
    provenanceManifests: 1000, acceptedIngestionRuns: 100,
    activeRightsGrants: 0, licenceVerifiedForPublishedEvidence: false,
  }});
  assert.equal(result.gates.find(g=>g.id==='medicine-evidence').passed, true);
  assert.equal(result.gates.find(g=>g.id==='source-rights').passed, false);
  assert.equal(result.gates.find(g=>g.id==='customer-boundary').passed, false);
});
test('unknown target and missing collections cannot be accepted', () => {
  const result = assessAtlasReleaseTruth({...observed, production: {
    ...observed.production, projectId: 'wrong', previewCollections: [],
  }});
  assert.equal(result.gates.find(g=>g.id==='production-cluster').passed, false);
  assert.equal(result.gates.find(g=>g.id==='database-schema').passed, false);
});
test('self-declared gates can only propose formal review; never mark production accepted', () => {
  const result = assessAtlasReleaseTruth({
    production: {...observed.production, ipAccessListEntries: 1},
    staging: observed.staging,
    aws: { approvedFixedEgress:true, tlsProbeFromApplicationRuntime:true,
      leastPrivilegeSecretRead:true, intelligenceProductionRunningTasks:1,
      applicationUsesAtlas:true, apiToAtlasQueryAccepted:true,
      mfaSessionAcceptance:true, crossTenantDenied:true, revocationVerified:true },
    medicines: { productionMedicineIdentityRows:1, productionMedicineEvidenceRows:1,
      provenanceManifests:1, acceptedIngestionRuns:1, activeRightsGrants:1,
      licenceVerifiedForPublishedEvidence:true },
    commerce: { catalogueProducts:392, checkoutApprovedOffers:392,
      physicallyVerifiedStockPositions:392, pricingAndClaimsApproved:true,
      realAuthorizedPaymentReconciled:true, signedWebhookVerified:true,
      fulfillmentAndRefundRehearsed:true },
    operations: { recoveryStrategyAccepted:true, restoreRehearsed:true,
      rpoRtoMeasured:true, alertDeliveryProven:true,
      exactShaDeploymentVerified:true, rollbackRehearsed:true },
  });
  assert.equal(result.readyForFormalReleaseReview,true);
  assert.equal(result.productionAccepted,false);
  assert.equal(result.atlasResourcesChanged,false);
  assert.equal(result.customerAccessChanged,false);
});
