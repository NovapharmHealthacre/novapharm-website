import { createHash } from 'node:crypto';
import { inspectWalesGpZipDirectory, inspectWalesPublisherZipDirectory } from './uk-wales-gp-zip-inventory.mjs';
import { BNF_SNOMED_PUBLIC_RESOURCE_RELEASES } from './uk-bnf-snomed-reference-quality.mjs';
import { constants } from 'node:fs';
import { lstat, open, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep, extname } from 'node:path';

/**
 * UK source archive integrity preflight for source-owned, privately obtained files.
 * This code deliberately cannot download, parse, ingest, approve rights or publish
 * pharmaceutical data. Rights and Quality acceptance must happen in another
 * independently reviewed workflow before an admitted observation is created.
 */
const definitions = [
  ['nhsbsa.epd', 'GB-ENG', 'England', 'month', ['CSV'], 'nhsbsa-prescribed-in-community', ['opendata.nhsbsa.net', 'nhsbsa-opendata.s3-eu-west-2.amazonaws.com']],
  ['nhsbsa.pca', 'GB-ENG', 'England', 'month', ['CSV'], 'nhsbsa-community-dispensed-reimbursement', ['opendata.nhsbsa.net', 'nhsbsa-opendata.s3-eu-west-2.amazonaws.com']],
  // Monthly terminology reference, not a prescribing/dispensing activity metric.
  ['nhsbsa.bnf-snomed-map', 'GB-ENG', 'England', 'month', ['CSV'], 'nhsbsa-bnf-snomed-reference-crosswalk', ['opendata.nhsbsa.net', 'nhsbsa-opendata.s3-eu-west-2.amazonaws.com']],
  ['phs.prescribed-dispensed', 'GB-SCT', 'Scotland', 'quarter', ['CSV'], 'phs-practice-to-dispensary-flow', ['www.opendata.nhs.scot', 'opendata.nhs.scot']],
  ['phs.prescriptions-community', 'GB-SCT', 'Scotland', 'month', ['CSV'], 'phs-community-paid-prescriptions', ['www.opendata.nhs.scot', 'opendata.nhs.scot']],
  ['nwssp.practice-pharmacy-flow', 'GB-WLS', 'Wales', 'month', ['XLS', 'XLSX'], 'nwssp-practice-pharmacy-flow', ['nwssp.nhs.wales']],
  ['nwssp.gp-prescribing', 'GB-WLS', 'Wales', 'month', ['ZIP'], 'nwssp-gp-prescribing', ['nwssp.nhs.wales']],
  ['nwssp.hospital-prescribing', 'GB-WLS', 'Wales', 'month', ['ZIP'], 'nwssp-hospital-origin-community-prescribing', ['nwssp.nhs.wales']],
  ['nwssp.dental-prescribing', 'GB-WLS', 'Wales', 'month', ['ZIP'], 'nwssp-dental-origin-community-prescribing', ['nwssp.nhs.wales']],
  ['nwssp.independent-pharmacist-prescribing', 'GB-WLS', 'Wales', 'month', ['ZIP'], 'nwssp-independent-pharmacist-community-prescribing', ['nwssp.nhs.wales']],
  ['bso.dispensing-contractor', 'GB-NIR', 'Northern Ireland', 'month', ['CSV'], 'bso-paid-contractor-flow', ['admin.opendatani.gov.uk', 'www.opendatani.gov.uk']],
  ['bso.gp-prescribing', 'GB-NIR', 'Northern Ireland', 'month', ['CSV'], 'bso-gp-dispensed-prescribing', ['admin.opendatani.gov.uk', 'www.opendatani.gov.uk']],
];

export const UK_SOURCE_ARCHIVE_CONTRACTS = Object.freeze(definitions.map(([sourceId, jurisdiction, nation, periodPrecision, formats, factGrain, publisherHosts]) =>
  Object.freeze({sourceId, jurisdiction, nation, periodPrecision, formats: Object.freeze(formats), factGrain, publisherHosts: Object.freeze(publisherHosts),
    geographyApplicability: sourceId === 'nhsbsa.bnf-snomed-map' ? 'not_applicable' : 'source_specific'})
));

const allowedFields = new Set([
  'contract', 'sourceId', 'jurisdiction', 'reportingPeriod', 'format', 'publisherUrl',
  'publisherResourceId', 'publisherFileName', 'sha256', 'byteSize', 'sourceVersion', 'discoveredAt',
]);

function deny(reason) { throw new Error(`UK national archive preflight refused: ${reason}`); }

function validPeriod(period, precision) {
  if (typeof period !== 'string') return false;
  if (precision === 'month') {
    if (!/^(?:19|20)\d{2}-(?:0[1-9]|1[0-2])$/.test(period)) return false;
    return true;
  }
  return /^(?:19|20)\d{2}-Q[1-4]$/.test(period);
}

function validHttpsPublisherUrl(urlString, hosts) {
  let url;
  try { url = new URL(urlString); }
  catch { deny('invalid publisher URL'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash || !hosts.includes(url.hostname))
    deny('unapproved publisher URL origin');
  return url;
}

export function validateUkNationalArchiveManifest(input) {
  if (!input || Array.isArray(input) || typeof input !== 'object') deny('manifest must be an object');
  // Do not silently accept caller-supplied 'rightsApproved', 'canPublish', etc.
  for (const field of Object.keys(input)) if (!allowedFields.has(field)) deny(`unrecognised field ${field}`);
  if (input.contract !== 'novapharm.uk.source-archive-candidate.v1') deny('contract version');
  const source = UK_SOURCE_ARCHIVE_CONTRACTS.find(item => item.sourceId === input.sourceId);
  if (!source) deny('unregistered source');
  if (input.jurisdiction !== source.jurisdiction) deny('jurisdiction mismatch');
  if (!validPeriod(input.reportingPeriod, source.periodPrecision)) deny('invalid or mismatched reporting period');
  if (!source.formats.includes(input.format)) deny('unsupported source format');
  const url = validHttpsPublisherUrl(input.publisherUrl, source.publisherHosts);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{2,159}$/.test(input.publisherResourceId ?? ''))
    deny('invalid or missing publisher resource identifier');
  // The monthly NHSBSA reference is a known publisher-resource mapping; a
  // different month's UUID cannot stand in for these candidate source bytes.
  if (input.sourceId === 'nhsbsa.bnf-snomed-map') {
    const expected = BNF_SNOMED_PUBLIC_RESOURCE_RELEASES[input.reportingPeriod]?.resourceId;
    if (!expected || expected !== input.publisherResourceId)
      deny('BNF–SNOMED publisher resource does not match reporting month');
    // Accept only the official NHSBSA CKAN resource page as provenance metadata,
    // not an unrelated same-host URL or an ephemeral signed object-store link.
    const approvedPaths = [
      '/dataset/bnf-snomed-mapping/resource/' + expected,
      '/dataset/ba1799d5-fac1-4432-8f76-ab7dfbb3e2f8/resource/' + expected,
    ];
    if (url.hostname !== 'opendata.nhsbsa.net' || url.search ||
        !approvedPaths.includes(url.pathname))
      deny('BNF–SNOMED archive metadata is not its official resource page');
  }
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{2,159}$/.test(input.publisherFileName ?? ''))
    deny('invalid or missing publisher file name');
  if (extname(input.publisherFileName).slice(1).toUpperCase() !== input.format)
    deny('publisher filename and format disagree');
  if (!/^[a-f0-9]{64}$/i.test(input.sha256 ?? '')) deny('missing immutable SHA-256');
  if (!Number.isSafeInteger(input.byteSize) || input.byteSize < 1 || input.byteSize > 12 * 1024 ** 3)
    deny('invalid or excessive source file size');
  if (typeof input.sourceVersion !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{2,99}$/.test(input.sourceVersion))
    deny('missing source-version label');
  // Date.parse can normalise nonexistent calendar dates (e.g. February 30).
  // Reconstruct the exact UTC timestamp so a forged discovery day cannot pass.
  const dateParts = typeof input.discoveredAt === 'string' &&
    /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,3}))?Z$/.exec(input.discoveredAt);
  const parsedTime = dateParts ? Date.parse(input.discoveredAt) : NaN;
  const expectedIso = dateParts
    ? dateParts[1] + '.' + (dateParts[2] ?? '').padEnd(3, '0') + 'Z'
    : null;
  if (!dateParts || !Number.isFinite(parsedTime) ||
      new Date(parsedTime).toISOString() !== expectedIso)
    deny('invalid metadata discovery date');
  if (!url.pathname || url.pathname === '/') deny('publisher dataset or resource path missing');
  return Object.freeze({
    contract: input.contract,
    sourceId: source.sourceId,
    jurisdiction: source.jurisdiction, // administrative publisher jurisdiction; not a data geography
    publisherNation: source.nation,
    nation: source.geographyApplicability === 'not_applicable' ? null : source.nation,
    geographyApplicability: source.geographyApplicability,
    geographicCoverageVerified: false,
    reportingPeriod: input.reportingPeriod,
    periodPrecision: source.periodPrecision,
    fileFormat: input.format,
    factGrain: source.factGrain,
    publisherResourceId: input.publisherResourceId,
    sourceVersion: input.sourceVersion,
    expectedBytes: input.byteSize,
    expectedSha256: input.sha256.toLowerCase(),
    // Never trust a boolean in a publisher manifest as an independent rights grant.
    status: 'quarantine_candidate',
    rightsStatus: 'independent_review_required',
    sourceSchemaValidated: false,
    datasetRecordsRead: 0,
    admittedMedicineRows: 0,
    canIngest: false,
    canPublish: false,
    customerCountryLive: false,
  });
}

function inside(root, child) {
  const part = relative(root, child);
  return !!part && !isAbsolute(part) && part !== '..' && !part.startsWith('..' + sep);
}

/**
 * Read-only, bounded archive integrity verification, with NOFOLLOW and realpath
 * containment. Does not parse contents, extract ZIPs or contact a publisher.
 * Use only in approved private quarantine storage, not inside Git or app bundles.
 */
export async function verifyUkNationalArchiveBytes(manifest, {archivePath, quarantineRoot}) {
  const plan = validateUkNationalArchiveManifest(manifest);
  if (typeof archivePath !== 'string' || typeof quarantineRoot !== 'string') deny('private paths required');
  const root = await realpath(resolve(quarantineRoot));
  const candidate = resolve(archivePath);
  if (!inside(root, candidate)) deny('archive outside private quarantine root');
  const fileStat = await lstat(candidate);
  if (fileStat.isSymbolicLink() || !fileStat.isFile()) deny('archive must be an ordinary file');
  const exactPath = await realpath(candidate);
  if (!inside(root, exactPath)) deny('archive escapes private quarantine root');
  if (extname(candidate).slice(1).toUpperCase() !== plan.fileFormat) deny('archive extension mismatch');
  if (fileStat.size !== plan.expectedBytes) deny('archive byte size mismatch');
  const handle = await open(exactPath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  let bytes = 0;
  const hash = createHash('sha256');
  let walesGpZipDirectory = null;
  let walesPublisherZipDirectory = null;
  try {
    const openedStat = await handle.stat();
    if (!openedStat.isFile() || openedStat.size !== plan.expectedBytes) deny('archive changed between checks');
    for await (const chunk of handle.createReadStream({autoClose: false})) {
      bytes += chunk.length;
      if (bytes > plan.expectedBytes) deny('archive over-read');
      hash.update(chunk);
    }
    // Hash, structural checks and receipt use one already-open file descriptor,
    // so a matching caller-supplied hash alone cannot certify an unsafe Welsh ZIP.
    if (bytes !== plan.expectedBytes || hash.digest('hex') !== plan.expectedSha256)
      deny('archive hash or size mismatch');
    if (plan.sourceId === 'nwssp.gp-prescribing') {
      walesGpZipDirectory = await inspectWalesGpZipDirectory(handle, {
        sourceId: plan.sourceId, reportingPeriod: plan.reportingPeriod,
      });
      if (walesGpZipDirectory.sourceRowsRead !== 0 || walesGpZipDirectory.canIngest !== false)
        deny('Wales structural gate exceeded read-only boundary');
    } else if (['nwssp.hospital-prescribing','nwssp.dental-prescribing',
                 'nwssp.independent-pharmacist-prescribing'].includes(plan.sourceId)) {
      walesPublisherZipDirectory = await inspectWalesPublisherZipDirectory(handle, {
        sourceId:plan.sourceId,reportingPeriod:plan.reportingPeriod,
      });
      if (walesPublisherZipDirectory.sourceRowsRead!==0 ||
          walesPublisherZipDirectory.canIngest!==false ||
          walesPublisherZipDirectory.canPublish!==false)
        deny('Wales prescribing structural gate exceeded read-only boundary');
    }
  } finally { await handle.close(); }
  return Object.freeze({
    ...plan, archiveIntegrityVerified: true,
    byteCount: bytes, // No raw records or document contents exposed.
    verifiedSha256: plan.expectedSha256,
    ...(walesGpZipDirectory ? {walesGpZipDirectory} : {}),
    ...(walesPublisherZipDirectory ? {walesPublisherZipDirectory} : {}),
    status: 'private_quarantine_integrity_verified',
    canIngest: false,
    canPublish: false,
    datasetRecordsRead: 0,
    admittedMedicineRows: 0,
  });
}

/** Prevent false UK-wide totals by adding overlapping source grains and periods. */
export function verifyNationalComparisonBoundary(left, right) {
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') deny('two data candidates required');
  const a = UK_SOURCE_ARCHIVE_CONTRACTS.find(x => x.sourceId === left.sourceId);
  const b = UK_SOURCE_ARCHIVE_CONTRACTS.find(x => x.sourceId === right.sourceId);
  if (!a || !b) deny('unregistered comparison source');
  if (a.jurisdiction !== b.jurisdiction) deny('cross-nation summation requires an independently accepted denominator and harmonisation contract');
  if (a.periodPrecision !== b.periodPrecision || left.reportingPeriod !== right.reportingPeriod)
    deny('incompatible reporting time periods');
  if (a.factGrain !== b.factGrain || a.sourceId !== b.sourceId)
    deny('incompatible or overlapping measure definitions');
  if (left.sourceVersion === right.sourceVersion) deny('duplicate data version would be double counted');
  return Object.freeze({nation: a.geographyApplicability === 'not_applicable' ? null : a.nation,
    geographyApplicability: a.geographyApplicability,
    geographicCoverageVerified: false,
    sourceId: a.sourceId, period: left.reportingPeriod,
    permittedOperation: 'version_reconciliation_only', canSumMetrics: false});
}
