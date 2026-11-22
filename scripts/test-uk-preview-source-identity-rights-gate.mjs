import test from 'node:test';
import assert from 'node:assert/strict';
import {
  UK_FOUR_NATION_REVIEW_SOURCE_IDS,
  canonicalUkFourNationSourceId,
  auditUkFourNationPendingReviewPreview,
} from '../src/core/uk-preview-source-identity-rights-gate.mjs';

const legacy = id => id === 'nhsbsa.epd' ? 'nhsbsa_english_prescribing' : id;
const versions = id => legacy(id) === 'nhsbsa_english_prescribing'
  ? 'metadata-2026-11-11' : 'publisher-metadata-2026-11-22';
const registry = () => UK_FOUR_NATION_REVIEW_SOURCE_IDS.map(id => ({
  source_id: legacy(id), source_version: versions(id),
  rights_status: 'pending_independent_review',
  accepted_observations: 0, customer_publish_approved: false,
}));
const reviews = () => UK_FOUR_NATION_REVIEW_SOURCE_IDS.map(id => ({
  source_id: legacy(id), source_version: versions(id),
  workspace_id: 'novapharm-internal-staging', environment: 'private_preview',
  status: 'pending_review', grant_active: false,
  rights_evidence_status: 'publisher_page_reference_only_independent_legal_verification_pending',
  verified_by_rights_authority: false, allowed_purposes: [],
  commercial_analysis_approved: false,
  third_party_terminology_reuse_approved: false,
  customer_publish_approved: false, approved_by: null, approval_record: null,
  rights_revision: 'pending-review-2026-11-22',
  review_opened_date: '2026-11-22',
}));
const audit = (sources = registry(), rights = reviews()) =>
  auditUkFourNationPendingReviewPreview({sourceDocuments: sources, rightsDocuments: rights});
const rejects = (sources, rights) => assert.throws(() => audit(sources, rights), /refused; no medicine data admitted/);

test('the controlled four-nation review scope is exactly 14 distinct canonical IDs', () => {
  assert.equal(UK_FOUR_NATION_REVIEW_SOURCE_IDS.length, 14);
  assert.equal(new Set(UK_FOUR_NATION_REVIEW_SOURCE_IDS).size, 14);
  assert.equal(canonicalUkFourNationSourceId('nhsbsa_english_prescribing'), 'nhsbsa.epd');
});
test('reconciles all 14 private preview identities and 14 non-granting review records', () => {
  const r = audit();
  assert.equal(r.expectedSourceCount, 14);
  assert.equal(r.previewSourceCount, 14);
  assert.equal(r.pendingReviewCount, 14);
  assert.equal(r.metadataReviewQueueComplete, true);
  assert.deepEqual(r.legacyAliasSourceIds, ['nhsbsa_english_prescribing']);
  assert.deepEqual(r.missingSourceIds, []);
  assert.deepEqual(r.missingPendingReviewIds, []);
  assert.equal(r.canIngest, false);
  assert.equal(r.canPublish, false);
  assert.equal(r.admittedMedicineRows, 0);
  assert.equal(r.independentSourceRightsApproved, false);
});
test('missing preview source is reported; no release approval is inferred', () => {
  const s = registry().slice(1), r = reviews().slice(1);
  const x = audit(s, r);
  assert.equal(x.metadataReviewQueueComplete, false);
  assert.deepEqual(x.missingSourceIds, ['nhsbsa.epd']);
  assert.equal(x.canIngest, false);
});
test('missing pending review is reported and cannot authorize ingestion', () => {
  const x = audit(registry(), reviews().slice(1));
  assert.equal(x.pendingReviewCount, 13);
  assert.deepEqual(x.missingPendingReviewIds, ['nhsbsa.epd']);
  assert.equal(x.canIngest, false);
});
test('orphan rights records without source metadata fail closed', () => {
  rejects(registry().slice(1), reviews());
});
test('canonical and legacy aliases cannot stand for two distinct EPD sources', () => {
  rejects([...registry(), {...registry()[0], source_id: 'nhsbsa.epd'}], reviews());
});
test('unknown or unregistered source IDs fail closed, not silently ignored', () => {
  const s = registry(); s[1].source_id = 'nhsbsa.unknown';
  rejects(s, reviews());
});
test('unexpected extra unrelated source document fails closed', () => {
  rejects([...registry(), {...registry()[0], source_id: 'openfda_drug'}], reviews());
});
test('source record cannot claim accepted medicine observations', () => {
  const s = registry(); s[0].accepted_observations = 1;
  rejects(s, reviews());
});
test('present source admission, rights and customer-live flags must all remain explicitly false', () => {
  for (const field of [
    'data_persisted', 'source_rights_grant_active',
    'independent_quality_approved', 'customer_country_live',
    'canIngest', 'canPublish',
  ]) {
    const s = registry(); s[0][field] = true;
    rejects(s, reviews());
    const unknown = registry(); unknown[0][field] = null;
    rejects(unknown, reviews());
  }
  const s = registry();
  Object.assign(s[0], {
    data_persisted: false, source_rights_grant_active: false,
    independent_quality_approved: false, customer_country_live: false,
    canIngest: false, canPublish: false, ingestion_status: 'metadata_only',
  });
  assert.equal(audit(s, reviews()).metadataReviewQueueComplete, true);
});
test('present source ingestion status cannot masquerade as metadata-only', () => {
  for (const status of ['admitted', 'live', 'production', null]) {
    const s = registry(); s[0].ingestion_status = status;
    rejects(s, reviews());
  }
});
test('source record cannot claim customer publication', () => {
  const s = registry(); s[4].customer_publish_approved = true;
  rejects(s, reviews());
});
test('unreviewed source rights status must remain pending', () => {
  const s = registry(); s[2].rights_status = 'approved';
  rejects(s, reviews());
});
test('a rights row with an active grant fails closed', () => {
  const r = reviews(); r[0].grant_active = true;
  rejects(registry(), r);
});
test('right-to-publish or commercial analysis cannot be smuggled into preview', () => {
  const r = reviews(); r[2].customer_publish_approved = true;
  rejects(registry(), r);
  const r2 = reviews(); r2[3].commercial_analysis_approved = true;
  rejects(registry(), r2);
});
test('named approval and permitted purposes are not pending review', () => {
  const r = reviews(); r[2].allowed_purposes = ['commercial'];
  rejects(registry(), r);
  const r2 = reviews(); r2[2].approved_by = 'someone';
  rejects(registry(), r2);
});
test('rights records must match the exact persisted source ID and version', () => {
  const r = reviews(); r[0].source_id = 'nhsbsa.epd';
  rejects(registry(), r);
  const r2 = reviews(); r2[0].source_version = 'wrong-source-version';
  rejects(registry(), r2);
});
test('wrong workspace or public environment fails closed', () => {
  const r = reviews(); r[2].workspace_id = 'outside';
  rejects(registry(), r);
  const r2 = reviews(); r2[2].environment = 'production';
  rejects(registry(), r2);
});
test('review state must be explicitly authority-unverified and unapproved', () => {
  const r = reviews(); r[2].verified_by_rights_authority = true;
  rejects(registry(), r);
  const r2 = reviews(); r2[2].third_party_terminology_reuse_approved = true;
  rejects(registry(), r2);
});
test('malformed or excessive arrays fail closed without external calls', () => {
  assert.throws(() => auditUkFourNationPendingReviewPreview(), /refused/);
  assert.throws(() => auditUkFourNationPendingReviewPreview({sourceDocuments: {}, rightsDocuments: []}), /refused/);
  rejects([...registry(), ...registry()], reviews());
});

test('a publisher URL without an explicit unverified evidence classification fails closed', () => {
  const r = reviews(); delete r[0].rights_evidence_status;
  rejects(registry(), r);
});
test('a false independent rights approval claim cannot hide behind a publisher URL', () => {
  const r = reviews(); r[4].rights_evidence_status = 'independent_legal_approved';
  rejects(registry(), r);
});
