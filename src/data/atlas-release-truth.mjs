/**
 * Pure, side-effect-free assessment of independently captured Atlas/AWS release evidence.
 * This DOES NOT connect to Atlas, authenticate customers, approve medicine rights,
 * or establish that a deployment is live. Missing/ambiguous facts fail closed.
 */
const PROD_PROJECT = '6af4010b0ca9668f51d9e058';
const STAGING_PROJECT = '6aede4d2bedcc3f04ecc6eb5';
const requiredIntelligenceCollections = Object.freeze([
  'npi_evidence_manifests', 'npi_source_rights', 'npi_audit_events',
  'npi_medicine_evidence', 'npi_medicine_identity', 'npi_ingestion_runs',
  'npi_source_registry',
]);
const requiredPreviewCollections = Object.freeze([
  'npi_customer_ownership_preview', 'npi_subscription_entitlements_preview',
  'npi_audit_preview', 'npi_medicine_evidence_preview',
  'npi_ingestion_runs_preview', 'npi_source_registry_preview',
  'npi_source_rights_preview', 'npi_billing_events_preview',
]);
const integerAtLeast = (value, min) => Number.isSafeInteger(value) && value >= min;
const booleanTrue = value => value === true;
const hasExactCollections = (names, required) => Array.isArray(names) &&
  names.every(name => typeof name === 'string') &&
  new Set(names).size === names.length &&
  required.every(name => names.includes(name));

/** No arbitrary user-provided success claim may bypass a missing verified gate. */
export function assessAtlasReleaseTruth(evidence = {}) {
  if (evidence === null || typeof evidence !== 'object' || Array.isArray(evidence)) {
    throw new TypeError('Atlas evidence must be an object');
  }
  const prod = evidence.production ?? {};
  const staging = evidence.staging ?? {};
  const aws = evidence.aws ?? {};
  const rights = evidence.medicines ?? {};
  const commerce = evidence.commerce ?? {};
  const ops = evidence.operations ?? {};
  const gates = [];
  const check = (section, id, passed, explanation) => gates.push(Object.freeze({
    section, id, passed: passed === true, explanation,
  }));

  check('foundation', 'production-cluster',
    prod.projectId === PROD_PROJECT && prod.cluster === 'npi-bootstrap' &&
    prod.region === 'EU_NORTH_1' && prod.state === 'IDLE' &&
    prod.paused === false && prod.provider === 'AWS',
    'Exact production project, cluster, state and AWS Stockholm region');
  check('foundation', 'staging-isolation',
    staging.projectId === STAGING_PROJECT && staging.cluster === 'novapharm-staging' &&
    staging.region === 'EU_NORTH_1' && staging.state === 'IDLE' &&
    hasExactCollections(staging.collections, ['nova_medicine_evidence_staging', 'contact_receipts_synthetic']),
    'Separate staging project with existing synthetic-only collections');
  check('foundation', 'database-schema',
    hasExactCollections(prod.collections, requiredIntelligenceCollections) &&
    hasExactCollections(prod.previewCollections, requiredPreviewCollections),
    'Required production and preview collection sets exist');
  check('foundation', 'restricted-network',
    integerAtLeast(prod.ipAccessListEntries, 1) && booleanTrue(aws.approvedFixedEgress) &&
    booleanTrue(aws.tlsProbeFromApplicationRuntime) && booleanTrue(aws.leastPrivilegeSecretRead),
    'Narrow Atlas allowlist, cost-approved fixed egress, real TLS ping and scoped runtime secret access');
  check('foundation', 'production-runtime',
    integerAtLeast(aws.intelligenceProductionRunningTasks, 1) &&
    booleanTrue(aws.applicationUsesAtlas) && booleanTrue(aws.apiToAtlasQueryAccepted),
    'Running customer-capable private workload with proven database query');

  check('intelligence', 'medicine-evidence',
    integerAtLeast(rights.productionMedicineIdentityRows, 1) &&
    integerAtLeast(rights.productionMedicineEvidenceRows, 1) &&
    integerAtLeast(rights.provenanceManifests, 1) &&
    integerAtLeast(rights.acceptedIngestionRuns, 1),
    'Real source-linked identity, observed evidence, ingestion and provenance are present');
  check('intelligence', 'source-rights',
    integerAtLeast(rights.activeRightsGrants, 1) &&
    booleanTrue(rights.licenceVerifiedForPublishedEvidence),
    'Purpose-specific active source rights for the actual published evidence');
  check('intelligence', 'customer-boundary',
    booleanTrue(aws.mfaSessionAcceptance) && booleanTrue(aws.crossTenantDenied) &&
    booleanTrue(aws.revocationVerified),
    'Actual OIDC/MFA session, negative cross-tenant access and revocation verified');

  check('commerce', 'catalogue-release',
    integerAtLeast(commerce.catalogueProducts, 1) &&
    integerAtLeast(commerce.checkoutApprovedOffers, commerce.catalogueProducts) &&
    integerAtLeast(commerce.physicallyVerifiedStockPositions, commerce.catalogueProducts) &&
    booleanTrue(commerce.pricingAndClaimsApproved),
    'All intended catalogue offers have approved prices, claims, verified stock and checkout flags');
  check('commerce', 'paid-order-lifecycle',
    booleanTrue(commerce.realAuthorizedPaymentReconciled) &&
    booleanTrue(commerce.signedWebhookVerified) && booleanTrue(commerce.fulfillmentAndRefundRehearsed),
    'Actual authorized payment, signed webhook, fulfillment and refund acceptance');

  check('operations', 'backup-restore',
    booleanTrue(ops.recoveryStrategyAccepted) && booleanTrue(ops.restoreRehearsed) &&
    booleanTrue(ops.rpoRtoMeasured),
    'Recoverability is demonstrated, not inferred from managed-database availability');
  check('operations', 'monitoring-and-release',
    booleanTrue(ops.alertDeliveryProven) && booleanTrue(ops.exactShaDeploymentVerified) &&
    booleanTrue(ops.rollbackRehearsed),
    'Alarm delivery, exact-sha production release and rollback demonstrated');

  const sections = Object.fromEntries(['foundation', 'intelligence', 'commerce', 'operations']
    .map(section => {
      const subset = gates.filter(g => g.section === section);
      return [section, Object.freeze({ satisfied: subset.filter(g => g.passed).length,
        total: subset.length, complete: subset.every(g => g.passed) })];
    }));
  return Object.freeze({
    kind: 'novapharm.atlas.release-readiness.v1',
    assessmentOnly: true,
    customerAccessChanged: false,
    atlasResourcesChanged: false,
    productionAccepted: false, // An independent formal release approval remains required.
    readyForFormalReleaseReview: gates.every(g => g.passed),
    sections: Object.freeze(sections),
    gates: Object.freeze(gates),
    blockedBy: Object.freeze(gates.filter(g => !g.passed).map(g => g.id)),
  });
}
