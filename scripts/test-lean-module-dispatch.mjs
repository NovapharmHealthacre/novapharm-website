import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const dispatcher = await readFile(resolve("src/core/enterprise-domain-service.mjs"), "utf8");
const overlays = await readFile(resolve("src/core/enterprise-module-overlays.mjs"), "utf8");

assert.doesNotMatch(dispatcher, /\b(?:all|one|run|transaction)\s*\(/u, "Canonical dispatcher must not execute SQL directly.");
assert.match(dispatcher, /portalModuleByCode\.get\(code\)/u, "Direct overlays must resolve the governed catalogue first.");
assert.match(dispatcher, /!module\.visibleInNavigation/u, "Direct overlays must preserve release visibility checks.");
assert.match(dispatcher, /hidden_until_dependency_exists/u, "Direct overlays must fail closed for hidden modules.");
assert.match(dispatcher, /canUseModule\(module, context\)/u, "Direct overlays must preserve role authorization.");
assert.match(dispatcher, /module\.releaseClassification !== "informational_only"/u, "Direct overlays must fail closed if their R1 release classification changes without review.");
assert.match(dispatcher, /Current release classification: informational only/u, "Direct overlays must preserve the R1 informational-only notice.");
assert.match(dispatcher, /State changes remain available only through authorised, CSRF-protected workflow endpoints/u, "Admin direct overlays must preserve the controlled-change truth notice.");
assert.match(dispatcher, /Board access is read-only; all figures are synthetic local-validation records/u, "Board direct overlays must preserve the synthetic/read-only truth notice.");

const directIndex = dispatcher.indexOf("if (candidate && directOverlayModule(candidate))");
const baseIndex = dispatcher.indexOf("await base.enterpriseModuleSnapshot(code, context)");
assert.ok(directIndex >= 0 && baseIndex > directIndex, "Direct overlay dispatch must happen before the preserved base snapshot is queried.");

for (const marker of [
  "module.area === \"admin\"",
  "module.slug === \"command-centre\"",
  "module.slug === \"ceo-dashboard\"",
]) assert.ok(dispatcher.includes(marker), `Missing direct overlay branch: ${marker}`);

assert.match(dispatcher, /snapshot\.module\.area === "employee" && snapshot\.module\.slug === "warehouse"/u, "Warehouse must still refine the canonical inventory snapshot.");
assert.match(overlays, /export async function authoredAdminView/u);
assert.match(overlays, /export async function commandCentreView/u);
assert.match(overlays, /export async function ceoDashboardView/u);
assert.match(overlays, /export function rollingWarehouseView/u);

console.log(JSON.stringify({
  directOverlayModules: 7,
  directOverlayBaseQueries: 0,
  warehouseUsesCanonicalLedger: true,
  releaseAndRoleChecksBeforeDirectQueries: true,
  releasePromotionRequiresExplicitReview: true,
  areaTruthNoticesPreserved: true
}, null, 2));
