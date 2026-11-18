/**
 * Repository-only, fail-closed NovaPharm Intelligence evidence inventory.
 * No live customer service, upstream API or native device is contacted.
 * A source declaration can never independently prove legal rights or deployment.
 */
const stat = (flag) => flag ? 1 : 0;
const expectedSchema = "novapharm.intelligence.global-source-candidates.v2";

export function assessIntelligenceEnterpriseReadiness({ registry, constraints, modelRegistry } = {}) {
  if (!registry || registry.schema !== expectedSchema || !Array.isArray(registry.sources) || registry.sources.length === 0) {
    throw new Error("Missing or invalid global source registry");
  }
  if (!constraints || !constraints.productionPermissions || !constraints.initialInfrastructureBudget ||
      typeof constraints.productionSignoff !== "string") {
    throw new Error("Missing owner production constraints");
  }
  if (!modelRegistry || !Array.isArray(modelRegistry.models)) throw new Error("Missing model inventory");
  const seenKeys = new Set();
  const byCountry = new Map();
  const sources = registry.sources.map((source) => {
    if (!source || typeof source !== "object" || Array.isArray(source) ||
        typeof source.country !== "string" || !source.country.trim() ||
        typeof source.candidateKey !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(source.candidateKey) ||
        seenKeys.has(source.candidateKey)) throw new Error("Malformed or duplicate global source candidate");
    seenKeys.add(source.candidateKey);
    if (!new Set(["not-reviewed", "rejected", "approved", "expired", "revoked"]).has(source.rightsStatus) ||
        !new Set(["candidate-only", "contract-tested", "staging", "production"]).has(source.integrationStatus) ||
        !new Set(["not-admitted", "quarantined", "admitted", "revoked"]).has(source.dataAdmission)) {
      throw new Error("Unknown source rights, integration or admission status");
    }
    const declaredRightsReviewed = source.rightsStatus === "approved" &&
      source.authorityVerification === "verified" && source.termsReview === "approved" &&
      typeof source.verifiedOn === "string" && /^\d{4}-\d{2}-\d{2}$/u.test(source.verifiedOn) &&
      typeof source.licenceEvidenceId === "string" && source.licenceEvidenceId.trim().length > 0 &&
      Array.isArray(source.allowedUses) && source.allowedUses.length > 0;
    const declaredRuntime = source.integrationStatus === "production" && source.dataAdmission === "admitted" &&
      typeof source.activeAdapterId === "string" && source.activeAdapterId.trim().length > 0;
    const contradictory = (source.integrationStatus === "production" || source.dataAdmission === "admitted") &&
      !(declaredRightsReviewed && declaredRuntime);
    const row = {
      candidateKey: source.candidateKey,
      country: source.country,
      rightsStatus: source.rightsStatus,
      integrationStatus: source.integrationStatus,
      dataAdmission: source.dataAdmission,
      declaredRightsReviewed,
      declaredProductionIntegration: declaredRuntime,
      requiresIndependentEvidence: true,
      contradictory
    };
    const country = byCountry.get(source.country) || [];
    country.push(row);
    byCountry.set(source.country, country);
    return row;
  });
  const countryRows = [...byCountry.entries()].sort(([a], [b]) => a.localeCompare(b, "en")).map(([country, rows]) => ({
    country,
    type: country === "Global" ? "cross-border-source-label" : "country-label",
    candidates: rows.length,
    rightsDeclaredReviewed: rows.reduce((n, x) => n + stat(x.declaredRightsReviewed), 0),
    productionIntegrationsDeclared: rows.reduce((n, x) => n + stat(x.declaredProductionIntegration), 0),
    enterpriseCoverageVerified: false, // Not derivable from discovery metadata alone.
    candidateKeys: rows.map(x => x.candidateKey).sort()
  }));
  const blockers = [];
  if (constraints.productionSignoff !== "granted") blockers.push("OWNER_PRODUCTION_SIGNOFF_MISSING");
  if (constraints.productionPermissions.activatePublicCustomerAccess !== true) blockers.push("CUSTOMER_ACTIVATION_NOT_APPROVED");
  if (constraints.productionPermissions.provisionNewPaidInfrastructure === true &&
      constraints.initialInfrastructureBudget.monthlyCapGbp === 0) blockers.push("INFRASTRUCTURE_SPEND_POLICY_CONFLICT");
  if (sources.some(x => x.contradictory)) blockers.push("INCONSISTENT_SOURCE_PRODUCTION_CLAIMS");
  if (sources.some(x => !x.declaredRightsReviewed)) blockers.push("SOURCE_RIGHTS_DECLARATIONS_INCOMPLETE");
  if (sources.some(x => !x.declaredProductionIntegration)) blockers.push("SOURCE_INTEGRATIONS_NOT_DECLARED_PRODUCTION");
  blockers.push("INDEPENDENT_DATA_RIGHTS_AND_OPERATIONAL_EVIDENCE_NOT_VERIFIED");
  blockers.push("MODEL_VALIDATION_AND_LIVE_INFERENCE_NOT_VERIFIED");
  blockers.push("SIGNED_IOS_ANDROID_AND_DEVICE_ACCEPTANCE_NOT_VERIFIED");
  blockers.push("PROTECTED_TENANT_SECURITY_AND_ROLLBACK_NOT_VERIFIED");
  return {
    schema: "novapharm.intelligence.enterprise-readiness-source-audit.v1",
    evidenceScope: "repository-metadata-only",
    enterpriseReady: false,
    completionPercent: null, // No defensible enterprise-wide denominator exists in this registry.
    metrics: {
      sourceCandidateCount: sources.length,
      distinctCountryLabelsIncludingGlobal: countryRows.length,
      distinctNamedCountries: countryRows.filter(x => x.type === "country-label").length,
      sourcesRightsDeclaredReviewed: sources.reduce((n,x) => n + stat(x.declaredRightsReviewed), 0),
      sourceProductionIntegrationsDeclared: sources.reduce((n,x) => n + stat(x.declaredProductionIntegration), 0),
      contradictoryClaims: sources.reduce((n,x) => n + stat(x.contradictory), 0),
      registeredModelEntries: modelRegistry.models.length
    },
    countryRows,
    blockers,
    explicitLimitations: [
      "101 source candidates are not 101 countries",
      "A source's self-declared approved fields cannot prove a licence, source accuracy, live adapter or publication right",
      "No customer, infrastructure, cloud account, signing authority, device or upstream dataset was queried",
      "Native apps, models and end-to-end protected services need separately attested external acceptance"
    ]
  };
}
