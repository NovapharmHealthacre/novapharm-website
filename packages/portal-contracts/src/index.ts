import moduleCatalog from "./module-catalog.json";

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

export const portalModules = Object.freeze(moduleCatalog as readonly PortalModule[]);
export const visiblePortalModules = Object.freeze(portalModules.filter((module) => module.visibleInNavigation && module.releaseClassification !== "removed"));
export const customerModules = Object.freeze(portalModules.filter((module) => module.area === "customer"));
export const employeeModules = Object.freeze(portalModules.filter((module) => module.area === "employee"));
export const executiveModules = Object.freeze(portalModules.filter((module) => module.area === "executive"));
export const adminModules = Object.freeze(portalModules.filter((module) => module.area === "admin"));
export const portalModuleByCode = new Map(portalModules.map((module) => [module.code, module]));
