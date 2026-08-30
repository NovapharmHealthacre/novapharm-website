import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const catalog = JSON.parse(await readFile(resolve("packages/portal-contracts/src/module-catalog.json"), "utf8"));
const baseSource = await readFile(resolve("src/core/enterprise-domain-service-base.mjs"), "utf8");
const dispatcherSource = await readFile(resolve("src/core/enterprise-domain-service.mjs"), "utf8");
const overlaySource = await readFile(resolve("src/core/enterprise-module-overlays.mjs"), "utf8");
const executiveViews = await readFile(resolve("src/core/executive-module-views.mjs"), "utf8");

assert.equal(catalog.length, 54, "The authored-module gate must cover the complete governed catalogue.");

function sliceBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.ok(startIndex >= 0 && endIndex > startIndex, `Unable to isolate source segment ${start} -> ${end}`);
  return source.slice(startIndex, endIndex);
}

const customerSource = sliceBetween(baseSource, "async function customerSnapshot", "async function employeeSnapshot");
const employeeSource = sliceBetween(baseSource, "async function employeeSnapshot", "async function executiveSnapshot");
const adminSource = overlaySource.slice(overlaySource.indexOf("export async function authoredAdminView"));
const visibleModules = catalog.filter((module) => module.visibleInNavigation);
const hiddenModules = catalog.filter((module) => module.releaseClassification === "hidden_until_dependency_exists");

const counts = Object.fromEntries(["customer", "employee", "executive", "admin"].map((area) => [area, catalog.filter((module) => module.area === area).length]));
assert.deepEqual(counts, { customer: 18, employee: 13, executive: 18, admin: 5 });
assert.equal(visibleModules.length, 47);
assert.equal(hiddenModules.length, 7);

for (const module of visibleModules) {
  let source;
  if (module.area === "customer") source = customerSource;
  else if (module.area === "employee" && module.slug !== "warehouse") source = employeeSource;
  else if (module.area === "employee") source = `${employeeSource}\n${overlaySource}`;
  else if (module.area === "admin") source = adminSource;
  else if (["command-centre", "ceo-dashboard"].includes(module.slug)) source = `${dispatcherSource}\n${overlaySource}`;
  else source = executiveViews;

  assert.ok(source.includes(`"${module.slug}"`), `${module.code}: release-visible module lacks an authored role-specific runtime path.`);
}

for (const module of hiddenModules) {
  assert.equal(module.area, "executive", `${module.code}: only explicitly governed Executive dependencies are hidden in the current release`);
  assert.equal(module.visibleInNavigation, false);
  assert.equal(executiveViews.includes(`"${module.slug}"`), false, `${module.code}: hidden-for-safety module must not acquire an active Executive view builder`);
}

assert.match(dispatcherSource, /hidden_until_dependency_exists/u, "Hidden modules must fail closed before view construction.");
assert.match(dispatcherSource, /module\.area === "admin" \|\| module\.area === "executive"/u, "Admin and Executive modules must use the direct authorization boundary.");
assert.match(overlaySource, /Admin module requires an authored snapshot/u, "Unknown future Admin modules must fail closed.");
assert.match(executiveViews, /Executive module requires an authored view or must remain hidden for safety/u, "Unexpected visible Executive modules must fail closed.");
assert.match(overlaySource, /rollingWarehouseView/u);

console.log(JSON.stringify({
  governedModules: catalog.length,
  visibleAuthoredModules: visibleModules.length,
  hiddenFailClosedModules: hiddenModules.length,
  authoredByArea: counts,
  currentVisibleGenericFallbackModules: 0,
  modularOverlayBoundary: true
}, null, 2));
