import moduleCatalog from "./module-catalog.json";

export type PortalArea = "customer" | "employee" | "executive" | "admin";
export type ModuleMaturity = "operational_foundation" | "blocked_external_integration" | "planned";

export type PortalModule = Readonly<{
  code: string;
  area: PortalArea;
  slug: string;
  title: string;
  route: string;
  purpose: string;
  maturity: ModuleMaturity;
  externalDependency: string | null;
}>;

export const portalModules = Object.freeze(moduleCatalog as readonly PortalModule[]);
export const customerModules = Object.freeze(portalModules.filter((module) => module.area === "customer"));
export const employeeModules = Object.freeze(portalModules.filter((module) => module.area === "employee"));
export const executiveModules = Object.freeze(portalModules.filter((module) => module.area === "executive"));
export const adminModules = Object.freeze(portalModules.filter((module) => module.area === "admin"));
export const portalModuleByCode = new Map(portalModules.map((module) => [module.code, module]));
