import { UK_SOURCE_ARCHIVE_CONTRACTS } from './uk-national-source-archive-preflight.mjs';

/**
 * Read-only, manifest-receipt-only historical partition completeness.
 * All outputs remain quarantined candidates, never publisher-authenticated,
 * never rights-approved, and never medicine facts.
 */
const refuse = why => {throw new Error('UK historic backfill candidate refused: ' + why);};
const monthPattern = /^(?:19|20)\d{2}-(?:0[1-9]|1[0-2])$/;
const quarterPattern = /^(?:19|20)\d{2}-Q[1-4]$/;
function indexOfPeriod(period, precision) {
  if (typeof period !== 'string' ||
      !(precision === 'month' ? monthPattern : quarterPattern).test(period))
    refuse('reporting period precision or syntax mismatch');
  const year = Number(period.slice(0,4));
  return precision === 'month' ?
    year * 12 + Number(period.slice(5)) - 1 :
    year * 4 + Number(period.slice(6)) - 1;
}
function periodFromIndex(index, precision) {
  if (precision === 'month') {
    const year = Math.floor(index / 12), month = index % 12 + 1;
    return String(year) + '-' + String(month).padStart(2,'0');
  }
  return String(Math.floor(index / 4)) + '-Q' + String(index % 4 + 1);
}
function verifiedQuarantineReceipt(receipt) {
  return receipt.archiveIntegrityVerified === true &&
    receipt.status === 'private_quarantine_integrity_verified' &&
    receipt.canIngest === false && receipt.canPublish === false &&
    receipt.admittedMedicineRows === 0 &&
    receipt.datasetRecordsRead === 0 &&
    typeof receipt.expectedSha256 === 'string' &&
    /^[a-f0-9]{64}$/.test(receipt.expectedSha256);
}
export function assessUkBackfillCandidateCoverage({sourceId, startPeriod, endPeriod, receipts} = {}) {
  const source = UK_SOURCE_ARCHIVE_CONTRACTS.find(s => s.sourceId === sourceId);
  if (!source) refuse('unregistered pharmaceutical source');
  if (!Array.isArray(receipts) || receipts.length > 512)
    refuse('missing or oversized private receipt set');
  const start = indexOfPeriod(startPeriod, source.periodPrecision);
  const end = indexOfPeriod(endPeriod, source.periodPrecision);
  const maxPeriodCount = source.periodPrecision === 'month' ? 240 : 80;
  if (start > end || end - start + 1 > maxPeriodCount)
    refuse('invalid or oversized historical date window');
  const byPeriod = new Map();
  for (const receipt of receipts) {
    if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt) ||
        receipt.sourceId !== sourceId || receipt.jurisdiction !== source.jurisdiction)
      refuse('foreign or malformed receipt');
    const index = indexOfPeriod(receipt.reportingPeriod, source.periodPrecision);
    if (index < start || index > end) refuse('receipt outside declared historic window');
    if (typeof receipt.sourceVersion !== 'string' ||
        !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(receipt.sourceVersion))
      refuse('missing bounded source version');
    const period = receipt.reportingPeriod;
    if (!byPeriod.has(period)) byPeriod.set(period, []);
    byPeriod.get(period).push(receipt);
  }
  const missingPeriods = [], unverifiedPeriods = [], conflictPeriods = [], candidateVerifiedPeriods = [];
  for (let i = start; i <= end; i++) {
    const period = periodFromIndex(i, source.periodPrecision);
    const entries = byPeriod.get(period) ?? [];
    if (!entries.length) missingPeriods.push(period);
    else if (entries.length !== 1) conflictPeriods.push(period);
    else if (!verifiedQuarantineReceipt(entries[0])) unverifiedPeriods.push(period);
    else candidateVerifiedPeriods.push(period);
  }
  const requestedPeriods = end - start + 1;
  return Object.freeze({
    contract:'novapharm.uk.private-backfill-candidate-coverage.v1',
    sourceId:source.sourceId,jurisdiction:source.jurisdiction,
    periodPrecision:source.periodPrecision,startPeriod,endPeriod,requestedPeriods,
    candidateIntegrityVerifiedPeriods:candidateVerifiedPeriods.length,
    candidateCoverageComplete:candidateVerifiedPeriods.length === requestedPeriods,
    missingPeriods:Object.freeze(missingPeriods),
    unverifiedPeriods:Object.freeze(unverifiedPeriods),
    conflictingVersionPeriods:Object.freeze(conflictPeriods),
    independentPublisherHashesVerified:false,
    sourceRightsIndependentlyApproved:false,
    clinicalRowsReconciled:0,
    admittedMedicineRows:0,
    canIngest:false,canPublish:false,customerCountryLive:false,
  });
}
