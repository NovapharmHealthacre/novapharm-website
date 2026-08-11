import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const catalog = JSON.parse(await readFile(resolve("packages/portal-contracts/src/module-catalog.json"), "utf8"));
const baseSource = await readFile(resolve("src/core/enterprise-domain-service-base.mjs"), "utf8");
const dispatcherSource = await readFile(resolve("src/core/enterprise-domain-service.mjs"), "utf8");
const overlaySource = await readFile(resolve("src/core/enterprise-module-overlays.mjs"), "utf8");

assert.equal(catalog.length, 54, "The authored-module gate must cover the complete governed catalogue.");

function sliceBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.ok(startIndex >= 0 && endIndex > startIndex, `Unable to isolate source segment ${start} -> ${end}`);
  return source.slice(startIndex, endIndex);
}

const customerSource = sliceBetween(baseSource, "async function customerSnapshot", "async function employeeSnapshot");
const employeeSource = sliceBetween(baseSource, "async function employeeSnapshot", "async function executiveSnapshot");
const executiveSource = sliceBetween(baseSource, "async function executiveSnapshot", "async function adminSnapshot");
const adminSource = overlaySource.slice(overlaySource.indexOf("export async function authoredAdminView"));

const counts = Object.fromEntries(["customer", "employee", "executive", "admin"].map((area) => [area, catalog.filter((module) => module.area === area).length]));
assert.deepEqual(counts, { customer: 18, employee: 13, executive: 18, admin: 5 });

for (const module of catalog) {
  let source;
  if (module.area === "customer") source = customerSource;
  else if (module.area === "employee" && module.slug !== "warehouse") source = employeeSource;
  else if (module.area === "employee") source = `${employeeSource}\n${overlaySource}`;
  else if (module.area === "admin") source = adminSource;
  else if (["command-centre", "ceo-dashboard"].includes(module.slug)) source = `${dispatcherSource}\n${overlaySource}`;
  else source = executiveSource;

  assert.ok(source.includes(`"${module.slug}"`), `${module.code}: current governed module lacks an authored role-specific source branch.`);
}

assert.match(overlaySource, /Admin module requires an authored snapshot/u, "Unknown future Admin modules must fail closed.");
assert.match(dispatcherSource, /directOverlayModule/u);
assert.match(overlaySource, /commandCentreView/u);
assert.match(overlaySource, /ceoDashboardView/u);
assert.match(overlaySource, /rollingWarehouseView/u);

console.log(JSON.stringify({ governedModules: catalog.length, authoredByArea: counts, currentGenericFallbackModules: 0, modularOverlayBoundary: true }, null, 2));
