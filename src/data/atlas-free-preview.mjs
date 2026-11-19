/**
 * Private free-tier NovaPharm Intelligence Atlas bootstrap contract.
 * This is a schema plan, not a live connection, customer entitlement or
 * permission to use a third-party medicine dataset. No network/database writes.
 */
export const freePreviewAtlasTarget = Object.freeze({
  projectId: "6af4010b0ca9668f51d9e058",
  clusterId: "6af404b1ced333839b51041f",
  clusterName: "npi-bootstrap",
  region: "EU_NORTH_1",
  provider: "AWS",
  tier: "FREE",
  database: "novapharm_intelligence_preview",
});

export const freePreviewAtlasCollections = Object.freeze({
  evidence: "npi_medicine_evidence_preview",
  rights: "npi_source_rights_preview",
  registry: "npi_source_registry_preview",
  ingestions: "npi_ingestion_runs_preview",
  owners: "npi_customer_ownership_preview",
  entitlements: "npi_subscription_entitlements_preview",
  billing: "npi_billing_events_preview",
  audits: "npi_audit_preview",
});

const f = freePreviewAtlasCollections;
const indexes = Object.freeze([
  { collection: f.evidence, name: "by_workspace_medicine_time", keys: { workspace_id: 1, medicine_identity: 1, observed_at: -1 } },
  { collection: f.rights, name: "by_workspace_source_version", keys: { workspace_id: 1, source_id: 1, source_version: 1 } },
  { collection: f.registry, name: "by_source_version", keys: { source_id: 1, source_version: 1 } },
  { collection: f.ingestions, name: "by_source_run", keys: { source_id: 1, recorded_at: -1 } },
  { collection: f.owners, name: "by_tenant_subject", keys: { tenant_id: 1, subject_id: 1 } },
  { collection: f.entitlements, name: "by_tenant_subscription", keys: { tenant_id: 1, stripe_subscription_id: 1 } },
  { collection: f.billing, name: "by_event_id", keys: { stripe_event_id: 1 } },
  { collection: f.audits, name: "by_tenant_time", keys: { tenant_id: 1, recorded_at: -1 } },
].map(spec => Object.freeze({ ...spec, keys: Object.freeze(spec.keys) })));

/** Exact schema index requirements for private operator verification. */
export const freePreviewAtlasIndexSpecs = indexes;

/** Operator-reviewed plan only; never creates a collection or an account. */
export function planFreePreviewAtlasBootstrap({ cluster, release } = {}) {
  if (!cluster ||
    cluster.projectId !== freePreviewAtlasTarget.projectId ||
    cluster.clusterId !== freePreviewAtlasTarget.clusterId ||
    cluster.name !== freePreviewAtlasTarget.clusterName ||
    cluster.provider !== freePreviewAtlasTarget.provider ||
    cluster.region !== freePreviewAtlasTarget.region ||
    cluster.instanceType !== freePreviewAtlasTarget.tier ||
    cluster.state !== "IDLE" || cluster.paused === true) {
    throw new Error("Unapproved Atlas free-preview cluster or unavailable state.");
  }
  if (!release || release.environment !== "preview" ||
    release.customerAccessEnabled !== false ||
    release.recurringBillingEnabled !== false ||
    release.sourceRightsAccepted !== false ||
    release.publicNetworkAllowed !== false ||
    release.patientDataAllowed !== false) {
    throw new Error("Free preview must be private and fail closed to paid or regulated traffic.");
  }
  return Object.freeze({
    contract: "novapharm.intelligence.atlas-free-preview-bootstrap.v1",
    database: freePreviewAtlasTarget.database,
    collections: Object.freeze(Object.values(f)),
    indexes,
    requiresExplicitOperatorApplication: true,
    requiresIndependentSourceAndTenantAcceptance: true,
    customerMedicineAccessAllowed: false,
    novaInferenceAllowed: false,
    forecastingProductionApproved: false,
    stripeRecurringBillingAllowed: false,
    enterpriseProductionAccepted: false,
  });
}

/** A collection count is not verified provenance, source rights, or a grant. */
export function assessFreePreviewInventory({ collections, counts } = {}) {
  if (!Array.isArray(collections) || !counts ||
    typeof counts !== "object" || Array.isArray(counts)) {
    throw new Error("Atlas inventory is incomplete.");
  }
  const current = new Set(collections);
  if (collections.some(v => typeof v !== "string") || current.size !== collections.length) {
    throw new Error("Atlas inventory contains invalid or duplicate collections.");
  }
  const missing = Object.values(f).filter(name => !current.has(name));
  const namedCounts = {};
  for (const name of Object.values(f)) {
    const n = counts[name];
    if (!missing.includes(name) && (!Number.isSafeInteger(n) || n < 0)) {
      throw new Error("Atlas counts are not independently verified.");
    }
    namedCounts[name] = missing.includes(name) ? null : n;
  }
  return Object.freeze({
    contract: "novapharm.intelligence.atlas-free-preview-inventory.v1",
    missingCollections: Object.freeze(missing),
    counts: Object.freeze(namedCounts),
    schemaPresent: missing.length === 0,
    acceptedMedicineRows: 0,
    licensedSourceRightsVerified: false,
    customerAccessAllowed: false,
    stripeBillingAllowed: false,
    enterpriseProductionAccepted: false,
  });
}
