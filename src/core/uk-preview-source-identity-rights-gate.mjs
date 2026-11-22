/**
 * Metadata-only UK source identity and pending-rights preview gate.
 * This module cannot read files, contact databases, admit medicine evidence,
 * resolve a licence, or grant a publication right. It only checks caller-
 * supplied, already-projected private preview registry/rights metadata.
 *
 * Input must be scoped to the 14 UK source identities tracked in programme
 * #1027, never all datasets in the broader medicine source registry.
 */
export const UK_FOUR_NATION_REVIEW_SOURCE_IDS = Object.freeze([
  'nhsbsa.epd',
  'nhsbsa.pca',
  'nhsbsa.bnf-snomed-map',
  'phs.prescribed-dispensed',
  'phs.prescriptions-community',
  'nwssp.practice-pharmacy-flow',
  'nwssp.gp-prescribing',
  'nwssp.hospital-prescribing',
  'nwssp.dental-prescribing',
  'nwssp.independent-pharmacist-prescribing',
  'nwssp.gp-dispensing',
  'nwssp.english-dispensing',
  'bso.dispensing-contractor',
  'bso.gp-prescribing',
]);

const SOURCE_IDS = new Set(UK_FOUR_NATION_REVIEW_SOURCE_IDS);
const ALIASES = Object.freeze({nhsbsa_english_prescribing: 'nhsbsa.epd'});
const PREVIEW_WORKSPACE = 'novapharm-internal-staging';
const REVIEW_DATE = /^20\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01])$/;
const DENY = () => { throw new Error('UK preview source identity and rights check refused; no medicine data admitted.'); };
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const nonemptyVersion = value => typeof value === 'string' &&
  /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/.test(value);

/**
 * Unlike similarity matching, this canonicalizes only an audited exact alias.
 * An unknown source ID fails closed rather than silently joining to a source.
 */
export function canonicalUkFourNationSourceId(id) {
  if (typeof id !== 'string') DENY();
  const canonical = Object.hasOwn(ALIASES, id) ? ALIASES[id] : id;
  if (!SOURCE_IDS.has(canonical)) DENY();
  return canonical;
}

function uniqueDocuments(input) {
  if (!Array.isArray(input) || input.length > SOURCE_IDS.size) DENY();
  const result = new Map();
  for (const doc of input) {
    if (!isRecord(doc) || !nonemptyVersion(doc.source_version)) DENY();
    const id = canonicalUkFourNationSourceId(doc.source_id);
    if (result.has(id)) DENY(); // Covers canonical + legacy EPD aliases.
    result.set(id, doc);
  }
  return result;
}

function checkPreviewSource(doc) {
  if (doc.accepted_observations !== 0 ||
      doc.customer_publish_approved !== false ||
      typeof doc.rights_status !== 'string' ||
      !doc.rights_status.startsWith('pending_')) DENY();
}

function checkPendingRights(doc, sourceDoc) {
  // Never borrow a grant across versions or between a canonical and legacy ID.
  if (doc.source_id !== sourceDoc.source_id ||
      doc.source_version !== sourceDoc.source_version ||
      doc.workspace_id !== PREVIEW_WORKSPACE ||
      doc.environment !== 'private_preview' ||
      doc.status !== 'pending_review' ||
      doc.grant_active !== false ||
      doc.verified_by_rights_authority !== false ||
      !Array.isArray(doc.allowed_purposes) || doc.allowed_purposes.length !== 0 ||
      doc.commercial_analysis_approved !== false ||
      doc.third_party_terminology_reuse_approved !== false ||
      doc.customer_publish_approved !== false ||
      doc.approved_by !== null || doc.approval_record !== null ||
      typeof doc.rights_revision !== 'string' ||
      !doc.rights_revision.startsWith('pending-review-') ||
      !REVIEW_DATE.test(doc.review_opened_date)) DENY();
}

/**
 * Reconcile only private UK metadata and denied-review records. Unknown
 * sources, duplicate aliases, active grants, mismatched revisions and any
 * admitted/publication flags always fail closed. Missing rows are reported,
 * never treated as consent or admission.
 */
export function auditUkFourNationPendingReviewPreview({sourceDocuments, rightsDocuments} = {}) {
  const sources = uniqueDocuments(sourceDocuments);
  const rights = uniqueDocuments(rightsDocuments);
  const missingSourceIds = [], missingPendingReviewIds = [], legacyAliasSourceIds = [];
  for (const id of UK_FOUR_NATION_REVIEW_SOURCE_IDS) {
    const source = sources.get(id);
    const review = rights.get(id);
    if (!source) {
      missingSourceIds.push(id);
      if (review) DENY(); // Orphaned review records cannot stand for a source.
      continue;
    }
    checkPreviewSource(source);
    if (source.source_id !== id) legacyAliasSourceIds.push(source.source_id);
    if (!review) {
      missingPendingReviewIds.push(id);
      continue;
    }
    checkPendingRights(review, source);
  }
  // Explicitly avoid returning any source-content fields, identifiers with
  // private account data, reviewer PII, document URLs or source hashes.
  return Object.freeze({
    contract: 'novapharm.uk.private-source-pending-review-inventory.v1',
    expectedSourceCount: SOURCE_IDS.size,
    previewSourceCount: sources.size,
    pendingReviewCount: rights.size,
    missingSourceIds: Object.freeze(missingSourceIds),
    missingPendingReviewIds: Object.freeze(missingPendingReviewIds),
    legacyAliasSourceIds: Object.freeze(legacyAliasSourceIds),
    metadataReviewQueueComplete: sources.size === SOURCE_IDS.size &&
      rights.size === SOURCE_IDS.size,
    independentSourceRightsApproved: false,
    clinicalRowsRead: 0,
    admittedMedicineRows: 0,
    canIngest: false,
    canPublish: false,
    customerCountryLive: false,
  });
}
