/**
 * Global source candidate identities mapped to ALREADY-EXISTING governed
 * private data-source discovery. This is a read-only alias catalogue.
 * Alias presence must NEVER enable a private probe or create source rights.
 */
export const globalSourceAliases = Object.freeze([
  Object.freeze({
    candidateKey: "europe-united-kingdom-nhsbsa-english-prescribing-dataset",
    existingSourceId: "nhsbsa.epd",
    jurisdiction: "GB-ENG",
    exactDatasetSlug: "english-prescribing-dataset-epd-with-snomed-code",
    integrationType: "existing-private-ckan-discovery",
    allowsCustomerAccess: false,
    allowsPrivateProbeActivation: false,
    allowsProductionIngestion: false,
    sourceRightsIndependentlyApproved: false,
    sourceAdmissionComplete: false
  })
]);

export function resolveGlobalSourceAlias(candidateKey, registry) {
  if (typeof candidateKey !== "string" || !Array.isArray(registry)) {
    throw new Error("Invalid source discovery input");
  }
  const match = globalSourceAliases.find((alias) => alias.candidateKey === candidateKey);
  const candidate = registry.find((item) => item?.candidateKey === candidateKey);
  if (!match || !candidate) return null;
  if (candidate.rightsStatus !== "not-reviewed" ||
      candidate.integrationStatus !== "candidate-only" ||
      candidate.dataAdmission !== "not-admitted" ||
      candidate.activeAdapterId !== null ||
      !candidate.url.includes(match.exactDatasetSlug)) {
    throw new Error("Unreviewed source alias may not be activated");
  }
  return Object.freeze({
    candidateKey,
    existingSourceId: match.existingSourceId,
    jurisdiction: match.jurisdiction,
    exactDatasetSlug: match.exactDatasetSlug,
    discoveryOnly: true,
    requiresIndependentSourceRights: true,
    privateProbeEnabled: false,
    customerVisible: false,
    productionDataAdmitted: false
  });
}
