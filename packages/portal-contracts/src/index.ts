import moduleCatalog from "./module-catalog.json";
import {
  documentAuthorityByModule,
  finalReleaseStateFor,
  governedPortalModuleCodes,
  hiddenDependencyAuthorities,
  moduleFinalReleaseStates,
  moduleReadEndpoint,
  protectedServerAuthoritiesByModule,
  securityClassificationByArea,
  securityClassificationByModule,
  writeEndpointByModule,
  type GovernedPortalModuleCode,
  type ModuleFinalReleaseState,
} from "./activation";

export type PortalArea = "customer" | "employee" | "executive" | "admin";
export type ModuleMaturity = "operational_foundation" | "blocked_external_integration" | "planned";
export type ModuleReleaseClassification = "fully_operational_and_tested" | "informational_only" | "hidden_until_dependency_exists" | "removed";

export type PortalModule = Readonly<{
  code: string;
  area: PortalArea;
  slug: string;
  title: string;
  route: string;
  purpose: string;
  maturity: ModuleMaturity;
  releaseClassification: ModuleReleaseClassification;
  releaseClassificationLabel: string;
  businessOwner: string;
  dataSource: string;
  dataSourceStatus: "repository_query_implemented_production_not_connected" | "not_connected";
  dataAuthority: string;
  readCapability: "repository_tested_read_model" | "none_while_hidden";
  writeCapability: "controlled_repository_write_implemented_but_not_released" | "none_read_only";
  externalDependency: string;
  authorisedRoles: readonly string[];
  testCoverage: readonly string[];
  validationDataState: "synthetic_non_confidential_only";
  visibleInNavigation: boolean;
  productionStatus: "not_deployed_owner_controlled";
  classificationRationale: string;
}>;

export type PortalModuleActivation = Readonly<{
  code: GovernedPortalModuleCode;
  purpose: string;
  businessOwner: string;
  route: string;
  allowedRoles: readonly string[];
  dataAuthority: string;
  currentRepositoryState: string;
  requiredExternalDependency: string;
  productionDataSource: string;
  readState: PortalModule["readCapability"];
  writeState: PortalModule["writeCapability"];
  apiEndpoints: readonly string[];
  releasedModuleApiEndpoints: readonly string[];
  implementedProtectedServerAuthorities: readonly string[];
  databaseTablesViews: readonly string[];
  documentAuthority: string;
  integrationDependencies: readonly string[];
  securityClassification: string;
  auditRequirements: readonly string[];
  currentTests: readonly string[];
  missingTests: readonly string[];
  accessibilityState: string;
  responsiveState: string;
  performanceState: string;
  monitoring: readonly string[];
  backupRecoveryImplications: string;
  finalReleaseState: ModuleFinalReleaseState;
  businessOwnerAcceptance: "NOT ACCEPTED FOR PRODUCTION";
  productionEvidence: readonly string[];
  knownLimitation: string;
}>;

export { moduleFinalReleaseStates, governedPortalModuleCodes };
export type { GovernedPortalModuleCode, ModuleFinalReleaseState };

export const portalModules = Object.freeze(moduleCatalog as readonly PortalModule[]);
export const visiblePortalModules = Object.freeze(portalModules.filter((module) => module.visibleInNavigation && module.releaseClassification !== "removed"));
export const customerModules = Object.freeze(portalModules.filter((module) => module.area === "customer"));
export const employeeModules = Object.freeze(portalModules.filter((module) => module.area === "employee"));
export const executiveModules = Object.freeze(portalModules.filter((module) => module.area === "executive"));
export const adminModules = Object.freeze(portalModules.filter((module) => module.area === "admin"));
export const portalModuleByCode = new Map(portalModules.map((module) => [module.code, module]));

const governedCodeSet = new Set<string>(governedPortalModuleCodes);
if (governedPortalModuleCodes.length !== 54 || governedCodeSet.size !== 54) throw new Error("The governed activation policy must contain exactly 54 unique Portal module codes.");
if (portalModules.length !== governedPortalModuleCodes.length) throw new Error("The Portal module catalogue and activation policy must remain one-to-one.");
for (const module of portalModules) {
  if (!governedCodeSet.has(module.code)) throw new Error(`Portal module ${module.code} is missing from the governed activation policy.`);
}

const noDocumentAuthority = "NOT APPLICABLE to the current module contract; any future document access must use an approved private document authority.";
const productionRecovery = "Fail closed to the non-operational state; suppress unsafe navigation/mutations, preserve audit, revoke affected access where required, restore or reconcile authoritative data/configuration using tested procedures, and require re-acceptance before reactivation.";

function auditRequirements(module: PortalModule, protectedAuthorities: readonly string[]): readonly string[] {
  const requirements = [
    "Record authenticated subject, effective role, module code, action, outcome, correlation/request identifier and timestamp.",
    "Record authorization denials and security-relevant failures.",
  ];
  if (module.writeCapability !== "none_read_only") requirements.push("Record released write intent, resulting canonical record/event identifiers and retry/dead-letter outcome.");
  if (protectedAuthorities.some((authority) => authority.startsWith("POST "))) requirements.push("Record protected server-authority invocation, CSRF/authorization outcome, actor, canonical result identifier and recovery/retry outcome even while the module UI remains read-only.");
  return Object.freeze(requirements);
}

function monitoringRequirements(module: PortalModule, protectedAuthorities: readonly string[]): readonly string[] {
  const requirements = ["route/API availability", "authorization denials", "error rate", "request latency", "audit-pipeline health"];
  if (module.area === "customer") requirements.push("customer-isolation violations must remain zero");
  if (module.area === "executive") requirements.push("authoritative-source freshness/staleness");
  if (module.area === "admin") requirements.push("privileged-change events");
  if (module.writeCapability !== "none_read_only") requirements.push("released write failure, retry and dead-letter state");
  if (protectedAuthorities.some((authority) => authority.startsWith("POST "))) requirements.push("protected server-authority denials, failures and recovery outcomes");
  return Object.freeze(requirements);
}

function missingTests(module: PortalModule, hidden: boolean, protectedAuthorities: readonly string[]): readonly string[] {
  const tests = hidden
    ? [
        "Named external authority/dependency acceptance in managed staging.",
        "Authenticated route/API acceptance after the dependency is approved.",
        "Module-specific accessibility, responsive and performance acceptance after visibility is enabled.",
        "Production monitoring, restore/rollback and business-owner acceptance evidence.",
      ]
    : [
        "Managed-staging identity/data/integration acceptance against the exact release SHA.",
        "Module-specific production monitoring and alert evidence.",
        "Tested backup/restore or recovery evidence for every authoritative source used by the module.",
        "Business-owner production acceptance evidence.",
      ];
  if (module.writeCapability !== "none_read_only") tests.push("End-to-end released-write recovery acceptance covering audit, retry/dead-letter handling and canonical record reconciliation.");
  if (protectedAuthorities.some((authority) => authority.startsWith("POST "))) tests.push("Managed-staging protected-authority acceptance covering CSRF, role denial, audit evidence, failure handling and recovery without implying that the module UI releases the mutation.");
  return Object.freeze(tests);
}

export const portalModuleActivationMatrix = Object.freeze(portalModules.map((module): PortalModuleActivation => {
  const code = module.code as GovernedPortalModuleCode;
  const finalReleaseState = finalReleaseStateFor(code);
  const hidden = finalReleaseState === "HIDDEN FOR SAFETY";
  const writeEndpoint = writeEndpointByModule[code as keyof typeof writeEndpointByModule];
  const apiEndpoints = [moduleReadEndpoint(code, hidden), ...(writeEndpoint ? [writeEndpoint] : [])];
  const protectedAuthorities = protectedServerAuthoritiesByModule[code as keyof typeof protectedServerAuthoritiesByModule] ?? [];
  const requiredIntegrationAuthority = hiddenDependencyAuthorities[code as keyof typeof hiddenDependencyAuthorities];
  const documentAuthority = documentAuthorityByModule[code as keyof typeof documentAuthorityByModule] ?? noDocumentAuthority;
  const securityClassification = securityClassificationByModule[code as keyof typeof securityClassificationByModule]
    ?? securityClassificationByArea[module.area];
  const repositoryState = `${module.maturity}; ${module.releaseClassification}; ${module.validationDataState}; ${module.productionStatus}`;
  const hiddenState = module.releaseClassification === "hidden_until_dependency_exists";
  if (hidden !== hiddenState) throw new Error(`${module.code}: release classification conflicts with final activation state.`);

  return Object.freeze({
    code,
    purpose: module.purpose,
    businessOwner: module.businessOwner,
    route: module.route,
    allowedRoles: Object.freeze([...module.authorisedRoles]),
    dataAuthority: module.dataAuthority,
    currentRepositoryState: repositoryState,
    requiredExternalDependency: module.externalDependency,
    productionDataSource: module.dataSource,
    readState: module.readCapability,
    writeState: module.writeCapability,
    apiEndpoints: Object.freeze(apiEndpoints),
    releasedModuleApiEndpoints: Object.freeze([...apiEndpoints]),
    implementedProtectedServerAuthorities: Object.freeze([...protectedAuthorities]),
    databaseTablesViews: Object.freeze([module.dataSource]),
    documentAuthority,
    integrationDependencies: Object.freeze([requiredIntegrationAuthority ?? module.externalDependency]),
    securityClassification,
    auditRequirements: auditRequirements(module, protectedAuthorities),
    currentTests: Object.freeze([...module.testCoverage]),
    missingTests: missingTests(module, hidden, protectedAuthorities),
    accessibilityState: hidden
      ? "HIDDEN — route/API must fail closed until the dependency earns visibility."
      : "REPOSITORY VERIFIED — browser acceptance exists; managed-staging accessibility acceptance is still required.",
    responsiveState: hidden
      ? "HIDDEN — route/API must fail closed until the dependency earns visibility."
      : "REPOSITORY VERIFIED — responsive browser acceptance exists; managed-staging/device acceptance is still required.",
    performanceState: hidden
      ? "HIDDEN — no production performance claim until the dependency earns visibility."
      : "REPOSITORY VERIFIED — Lighthouse/browser evidence exists; managed-staging and post-go-live performance evidence are still required.",
    monitoring: monitoringRequirements(module, protectedAuthorities),
    backupRecoveryImplications: productionRecovery,
    finalReleaseState,
    businessOwnerAcceptance: "NOT ACCEPTED FOR PRODUCTION",
    productionEvidence: Object.freeze([]),
    knownLimitation: requiredIntegrationAuthority
      ?? "No accepted production Portal runtime, production identity mapping, canonical production data connection, active production monitoring or tested production recovery evidence exists at R1.",
  });
}));

export const portalModuleActivationByCode = new Map(portalModuleActivationMatrix.map((module) => [module.code, module]));
export const dependencyBlockedPortalModules = Object.freeze(portalModuleActivationMatrix.filter((module) => module.finalReleaseState === "DEPENDENCY-BLOCKED"));
export const hiddenForSafetyPortalModules = Object.freeze(portalModuleActivationMatrix.filter((module) => module.finalReleaseState === "HIDDEN FOR SAFETY"));
