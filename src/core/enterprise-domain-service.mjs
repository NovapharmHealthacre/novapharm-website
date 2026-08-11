import { nowIso } from "../data/database.mjs";
import * as base from "./enterprise-domain-service-base.mjs";
import {
  authoredAdminView,
  ceoDashboardView,
  commandCentreView,
  rollingWarehouseView,
} from "./enterprise-module-overlays.mjs";
import { portalModuleByCode } from "./portal-module-catalog.mjs";

export * from "./enterprise-domain-service-base.mjs";

function forbidden(message = "You do not have permission for this module.") {
  return Object.assign(new Error(message), { statusCode: 403 });
}

function canUseModule(module, context) {
  const scope = { customer: "customer", employee: "employee", executive: "board", admin: "admin" }[module.area];
  return context.accessScopes?.includes(scope) || context.accessScopes?.includes("admin");
}

function directOverlayModule(module) {
  return module.area === "admin"
    || (module.area === "executive" && ["command-centre", "ceo-dashboard"].includes(module.slug));
}

function directSnapshotEnvelope(module) {
  const validationEnvironment = process.env.LOCAL_PORTAL_MODE === "true" || process.env.BROWSER_VALIDATION_MODE === "true";
  const areaNotice = module.area === "admin"
    ? "State changes remain available only through authorised, CSRF-protected workflow endpoints. Raw-table editing is intentionally unavailable."
    : "Board access is read-only; all figures are synthetic local-validation records.";
  return {
    module,
    environment: process.env.BROWSER_VALIDATION_MODE === "true"
      ? "browser_validation"
      : process.env.LOCAL_PORTAL_MODE === "true"
        ? "local_validation"
        : process.env.NODE_ENV === "production"
          ? "production"
          : "development",
    dataState: validationEnvironment ? "synthetic" : "canonical",
    dataFreshness: nowIso(),
    readOnly: true,
    metrics: [],
    sections: [],
    notices: [
      areaNotice,
      "Current release classification: informational only. Repository write contracts are not released as live operations.",
    ],
    actions: [],
  };
}

function authoriseDirectOverlay(code, context) {
  const module = portalModuleByCode.get(code);
  if (!module) throw Object.assign(new Error("Portal module not found."), { statusCode: 404 });
  if (!module.visibleInNavigation || module.releaseClassification === "hidden_until_dependency_exists" || module.releaseClassification === "removed") {
    throw Object.assign(new Error("Portal module is not available in this release."), { statusCode: 404 });
  }
  if (!canUseModule(module, context)) throw forbidden();
  if (module.releaseClassification !== "informational_only") {
    throw Object.assign(new Error("Direct module release classification requires an explicit dispatcher review."), { statusCode: 500 });
  }
  return module;
}

export async function enterpriseModuleSnapshot(code, context) {
  const candidate = portalModuleByCode.get(code);
  if (candidate && directOverlayModule(candidate)) {
    const module = authoriseDirectOverlay(code, context);
    const envelope = directSnapshotEnvelope(module);
    if (module.area === "admin") return authoredAdminView(envelope);
    if (module.slug === "command-centre") return commandCentreView(envelope);
    if (module.slug === "ceo-dashboard") return ceoDashboardView(envelope);
    throw Object.assign(new Error("Authored direct module has no snapshot builder."), { statusCode: 500 });
  }

  const snapshot = await base.enterpriseModuleSnapshot(code, context);
  if (snapshot.module.area === "employee" && snapshot.module.slug === "warehouse") return rollingWarehouseView(snapshot);
  return snapshot;
}
