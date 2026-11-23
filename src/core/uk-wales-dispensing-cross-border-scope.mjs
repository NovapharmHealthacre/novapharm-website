/**
 * Wales dispensing source *scope* labels only. No pharmaceutical row, scheme,
 * clinical metric, person, licence or archive is loaded by this module.
 * Official NWSSP publisher descriptions are not independent source admission.
 */
const sourceDefinitions = Object.freeze({
  'nwssp.gp-dispensing': Object.freeze({
    publisher: 'NWSSP',
    publisherJurisdiction: 'GB-WLS',
    prescribingJurisdictions: Object.freeze(['GB-WLS']),
    communityDispensingJurisdictions: Object.freeze(['GB-WLS', 'GB-ENG']),
    sourceGrain: 'wales_gp_origin_community_dispensing_presentation',
    note: 'GP and practice-delegated nonmedical prescribing in Wales; community dispensing may occur in Wales or England',
  }),
  'nwssp.english-dispensing': Object.freeze({
    publisher: 'NWSSP',
    publisherJurisdiction: 'GB-WLS',
    prescribingJurisdictions: Object.freeze(['GB-ENG']),
    communityDispensingJurisdictions: Object.freeze(['GB-WLS']),
    sourceGrain: 'england_origin_wales_community_dispensing_presentation',
    note: 'England-origin prescriptions dispensed in community pharmacies in Wales',
  }),
});

const allowedFields = new Set(['sourceId', 'reportingPeriod', 'sourceVersion']);
const validMonth = /^(?:19|20)\d{2}-(?:0[1-9]|1[0-2])$/;
const validVersion = /^[A-Za-z0-9][A-Za-z0-9._-]{2,99}$/;
function deny(reason) { throw new Error('Wales dispensing source-scope refused: ' + reason); }
export const WALES_DISPENSING_SCOPE_SOURCE_IDS = Object.freeze(Object.keys(sourceDefinitions));

/**
 * Validate an asserted publisher-scope label only; never trust input metadata
 * as a row-level geographical observation or independent approval.
 */
export function classifyWalesDispensingSource(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) deny('object required');
  // Only own, plain data fields can assert a publisher source identity.
  // Prototype inheritance, getters and symbol fields must never bypass denial.
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) deny('plain metadata object required');
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== 'string' || !allowedFields.has(key)) deny('unexpected metadata field');
  }
  for (const key of allowedFields) {
    if (!Object.hasOwn(input, key)) deny('missing required field ' + key);
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) deny('data field required ' + key);
  }
  if (typeof input.sourceId !== 'string' || !Object.hasOwn(sourceDefinitions, input.sourceId))
    deny('unsupported source identity');
  const def = sourceDefinitions[input.sourceId];
  if (typeof input.reportingPeriod !== 'string' || !validMonth.test(input.reportingPeriod))
    deny('invalid reporting month');
  if (typeof input.sourceVersion !== 'string' || !validVersion.test(input.sourceVersion))
    deny('invalid candidate source version');
  return Object.freeze({
    contract: 'novapharm.uk.wales-dispensing-scope.v1',
    sourceId: input.sourceId,
    reportingPeriod: input.reportingPeriod,
    sourceVersion: input.sourceVersion,
    publisher: def.publisher,
    publisherJurisdiction: def.publisherJurisdiction,
    prescribingJurisdictions: def.prescribingJurisdictions,
    communityDispensingJurisdictions: def.communityDispensingJurisdictions,
    sourceGrain: def.sourceGrain,
    publisherDescription: def.note,
    sourceMetadataOnly: true,
    actualRowGeographyVerified: false,
    patientResidenceVerified: false,
    archiveFormatVerified: false,
    publisherFileHashVerified: false,
    sourceSchemaVerified: false,
    independentSourceRightsApproved: false,
    independentQualityApproved: false,
    admittedMedicineRows: 0,
    canIngest: false,
    canPublish: false,
    canSumMetrics: false,
  });
}

/**
 * Both source families are protected from accidental "Wales totals" or
 * England EPD/PCA joins without a separately licensed, reconciled denominator.
 * A pair report is NOT evidence that its observations are disjoint or overlap.
 */
export function assessWalesDispensingSourcePair(left, right) {
  const a = classifyWalesDispensingSource(left);
  const b = classifyWalesDispensingSource(right);
  let relationship = 'different_prescribing_origin_and_dispensing_scope';
  if (a.sourceId === b.sourceId) {
    if (a.reportingPeriod === b.reportingPeriod) {
      relationship = a.sourceVersion === b.sourceVersion
        ? 'identical_metadata_candidate'
        : 'same_period_version_conflict';
    } else relationship = 'different_reporting_periods';
  }
  return Object.freeze({
    contract: 'novapharm.uk.wales-dispensing-comparability.v1',
    leftSourceId: a.sourceId,
    rightSourceId: b.sourceId,
    leftReportingPeriod: a.reportingPeriod,
    rightReportingPeriod: b.reportingPeriod,
    relationship,
    publisherScopeOnly: true,
    independentMeasureGrainReconciliationRequired: true,
    separateOriginAndCommunityDispensingAttributionRequired: true,
    actualCrossSourceOverlapVerified: false,
    personResidenceInferred: false,
    crossBorderNationalSumAllowed: false,
    englandEpdOrPcaAdditivityProven: false,
    rightsApproved: false,
    clinicalQualityApproved: false,
    canSumMetrics: false,
    canIngest: false,
    canPublish: false,
    admittedMedicineRows: 0,
  });
}
