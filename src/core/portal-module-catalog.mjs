import moduleCatalog from "../../packages/portal-contracts/src/module-catalog.json" with { type: "json" };

const byArea = (area) => Object.freeze(moduleCatalog.filter((entry) => entry.area === area).map((entry) => Object.freeze(entry)));

export const customerModules = byArea("customer");
export const employeeModules = byArea("employee");
export const executiveModules = byArea("executive");
export const adminModules = byArea("admin");
export const portalModules = Object.freeze([...customerModules, ...employeeModules, ...executiveModules, ...adminModules]);
export const portalModuleByCode = new Map(portalModules.map((entry) => [entry.code, entry]));
