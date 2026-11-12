/**
 * OpenFDA NDC product-to-package inspection, QUARANTINE ONLY.
 * No customer API, source rights approval, manufacturer verification, US FDA
 * drug approval claim, clinical equivalence, stock or medicine ID joins.
 * This module never writes, downloads, authorizes access or contacts providers.
 */
import { createHash } from 'node:crypto';
const digest = text => createHash('sha256').update(text, 'utf8').digest('hex');
const sha = /^[0-9a-f]{64}$/u;
const ndc = /^\d{4,6}-\d{3,4}$/u;
const packageNdc = /^\d{4,6}-\d{3,4}-\d{1,3}$/u;
const time = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/u;
const reject = code => Object.assign(new Error('Unapproved FDA NDC snapshot rejected.'), { code });
const clean = value => typeof value === 'string' ? value.trim().replace(/[\x00-\x1F\x7F]/gu, ' ').slice(0, 160) : null;

/**
 * Inspect exact raw UTF-8 bytes against a supplied copy digest. This is a
 * copy-integrity check, not proof the manifest itself was independently signed.
 */
export function inspectOpenFdaNdcQuarantine({rawJson, recordedSha256, inspectedAt} = {}) {
  if (typeof rawJson !== 'string' || !rawJson.length || Buffer.byteLength(rawJson, 'utf8') > 2_000_000 ||
      typeof recordedSha256 !== 'string' || !sha.test(recordedSha256) ||
      typeof inspectedAt !== 'string' || !time.test(inspectedAt) ||
      !Number.isFinite(Date.parse(inspectedAt)) || new Date(Date.parse(inspectedAt)).toISOString() !== inspectedAt) {
    throw reject('invalid_inspection_input');
  }
  const actualSha = digest(rawJson);
  if (actualSha !== recordedSha256) throw reject('copy_digest_mismatch');
  let data;
  try { data = JSON.parse(rawJson); } catch { throw reject('unparseable_json'); }
  const meta = data?.meta;
  if (meta?.license !== 'https://open.fda.gov/license/' ||
      meta?.terms !== 'https://open.fda.gov/terms/' ||
      typeof meta.last_updated !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(meta.last_updated) ||
      !Number.isFinite(Date.parse(meta.last_updated)) ||
      Date.parse(meta.last_updated) > Date.parse(inspectedAt) ||
      !Number.isSafeInteger(meta?.results?.total) || meta.results.total < 0 ||
      !Number.isSafeInteger(meta?.results?.limit) || meta.results.limit < 1 || meta.results.limit > 100 ||
      meta?.results?.skip !== 0 || !Array.isArray(data.results) || data.results.length > 100 ||
      data.results.length > meta.results.limit) throw reject('unsupported_publisher_envelope');
  const products = [], packs = [], links = [], unresolved = [];
  const ids = new Set(), pids = new Set(), packIds = new Set();
  for (let index = 0; index < data.results.length; index++) {
    const row = data.results[index];
    const productNdc = row?.product_ndc;
    const productId = row?.product_id;
    if (!ndc.test(String(productNdc ?? '')) || typeof productId !== 'string' ||
        !productId.startsWith(productNdc + '_') || productId.length > 100 ||
        !/^[A-Za-z0-9_-]+$/u.test(productId) ||
        !/\bapixaban\b/iu.test(row?.generic_name ?? '') ||
        ids.has(productNdc) || pids.has(productId)) throw reject('unresolved_product_identity_or_duplicate');
    ids.add(productNdc); pids.add(productId);
    const id = 'fda-ndc-product:' + productId;
    products.push({ id, productNdc, genericName: clean(row.generic_name), dosageForm: clean(row.dosage_form),
      labelerName: clean(row.labeler_name), marketCategory: clean(row.marketing_category),
      sourceEntityType: 'labeler_submitted_listing_not_fda_approval' });
    if (!Array.isArray(row.packaging) || row.packaging.length === 0) {
      unresolved.push({ productNdc, reason: 'no_recorded_package' });
      continue;
    }
    if (row.packaging.length > 100) throw reject('unbounded_package_list');
    for (const pack of row.packaging) {
      const rawPackId = pack?.package_ndc;
      if (!packageNdc.test(String(rawPackId ?? '')) ||
          !rawPackId.startsWith(productNdc + '-') || packIds.has(rawPackId)) {
        // Unknown pack relationships are not guessed or attached to a product.
        unresolved.push({ productNdc, reason: 'invalid_or_duplicate_package' });
        continue;
      }
      packIds.add(rawPackId);
      const packNodeId = 'fda-ndc-package:' + rawPackId;
      packs.push({ id: packNodeId, packageNdc: rawPackId, description: clean(pack.description),
        sampleListing: pack.sample === true });
      links.push({ from: id, to: packNodeId, relationship: 'publisher_listed_package_for_product' });
    }
  }
  // Complete solely for THIS query page, not the national drug catalogue.
  const singleQueryPageComplete = data.results.length === meta.results.total &&
    meta.results.total <= meta.results.limit;
  products.sort((a,b)=>a.id.localeCompare(b.id));
  packs.sort((a,b)=>a.id.localeCompare(b.id));
  links.sort((a,b)=>a.from.localeCompare(b.from)||a.to.localeCompare(b.to));
  const projectionDigest = digest(JSON.stringify({ products, packs, links, unresolved }));
  return Object.freeze({
    contract: 'novapharm.intelligence.openfda-ndc-quarantine.v1',
    sourceId: 'us.fda.openfda.ndc', sourceTerms: meta.terms, sourceLicence: meta.license,
    publisherLastUpdated: meta.last_updated, inspectedAt, rawSha256: actualSha,
    singleQueryPageComplete, reportedMatches: meta.results.total,
    productCount: products.length, packCount: packs.length,
    missingOrUnresolvedRelationships: unresolved.length,
    products, packs, relationships: links, unresolved,
    projectionSha256: projectionDigest, dataState: 'quarantined_unapproved',
    canonicalMedicineIdentityEstablished: false, independentSourceAuthenticityVerified: false,
    commercialRightsAccepted: false, fdaApprovalProven: false,
    customerPublishingApproved: false, ingestionCommitted: false,
    limitations: [
      'Copy SHA-256 does not verify publisher origin, rights or live refresh.',
      'A product NDC listing does not imply FDA approval, clinical equivalence, reimbursement or availability.',
      'Labeler names are not independently verified manufacturers or suppliers.',
      'Recorded pack links are only source-submitted, and unresolved packs remain explicit.',
      'The source snapshot remains unapproved; no graph may be joined to the canonical medicine ID without independent review.'
    ]
  });
}