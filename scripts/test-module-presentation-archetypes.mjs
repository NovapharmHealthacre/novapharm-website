import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const catalog = JSON.parse(await readFile(resolve("packages/portal-contracts/src/module-catalog.json"), "utf8"));
const presentations = JSON.parse(await readFile(resolve("apps/portal/data/module-presentations.json"), "utf8"));
const portalClient = await readFile(resolve("apps/portal/components/portal-client.tsx"), "utf8");
const dashboard = await readFile(resolve("apps/portal/components/dashboard.tsx"), "utf8");
const css = await readFile(resolve("apps/portal/components/module-presentations.module.css"), "utf8");
const allowed = new Set(["command", "ledger", "workflow", "catalogue", "tracking", "documents", "regulated", "intelligence"]);

assert.equal(catalog.length, 54);
assert.equal(Object.keys(presentations).length, 54, "Every governed module needs exactly one presentation archetype.");
assert.deepEqual(new Set(Object.keys(presentations)), new Set(catalog.map((module) => module.code)), "Presentation assignments must match the governed catalogue exactly.");

for (const [code, archetype] of Object.entries(presentations)) {
  assert.ok(allowed.has(archetype), `${code}: unsupported presentation archetype ${archetype}`);
}
for (const archetype of allowed) {
  assert.ok(Object.values(presentations).includes(archetype), `${archetype}: archetype must be used by at least one governed module`);
  assert.match(css, new RegExp(`\\.${archetype}\\s`, "u"), `${archetype}: archetype styling is missing`);
}

assert.match(portalClient, /data-module=\{module\.code\}/u, "Presentation wrapper must expose the governed module code for role-level visual hierarchy.");
assert.match(portalClient, /data-presentation=\{archetype\}/u);
assert.match(portalClient, /has no governed presentation archetype/u, "Unknown future modules must fail closed visually.");
assert.match(portalClient, /incomplete presentation stylesheet contract/u, "Missing CSS archetypes must fail closed rather than render generic UI.");
assert.match(portalClient, /<Dashboard module=\{module\}/u, "Presentation layer must wrap the existing authenticated Dashboard rather than replace it.");

assert.match(dashboard, /gatewayJson<\{ user: PortalUser \}>\("portal\/session"\)/u, "Authenticated Dashboard must retain session verification.");
assert.match(dashboard, /protectedMutation/u, "Authenticated Dashboard must retain controlled mutation plumbing.");
assert.match(dashboard, /enterprise\/modules\/\$\{encodeURIComponent\(module\.code\)\}/u, "Authenticated Dashboard must retain server-authorized module loading.");
assert.doesNotMatch(dashboard, /module-presentations/u, "Presentation concerns must stay outside the security/data-fetch component.");
assert.doesNotMatch(dashboard, /data-presentation|data-module/u, "Authenticated Dashboard must not absorb presentation routing metadata.");

for (const area of ["customer", "employee", "executive", "admin"]) {
  assert.match(css, new RegExp(`\\.presentation\\[data-module\\^="${area}\\."\\]`, "u"), `${area}: role-level presentation accent is missing`);
}
assert.match(css, /\.workspace-sidebar a:not\(\.active\) small\)[\s\S]*display: none/u, "Inactive navigation must not repeat informational-only status noise on every row.");
assert.match(css, /\.module-notice \+ \.module-notice\)[\s\S]*border-top/u, "Consecutive truth statements must read as one evidence rail rather than stacked notification cards.");

assert.match(css, /\.command :global\(\.metric-grid\)[\s\S]*gap: 1px[\s\S]*background: transparent/u, "Command KPI grids must keep unused columns as real whitespace rather than phantom grey cards.");
assert.match(css, /\.command :global\(\.metric\)[\s\S]*border: 1px solid var\(--presentation-rule\)/u, "Command KPI cards must own their visible boundary instead of relying on a grid filler background.");
assert.match(css, /\.workflow :global\(\.metric-grid\)[\s\S]*background: transparent/u, "Workflow KPI grids must not paint unused columns.");
assert.match(css, /\.workflow :global\(\.metric\)[\s\S]*border: 1px solid var\(--presentation-rule\)/u, "Workflow KPI cards must own their visible boundary.");
assert.match(css, /\.intelligence :global\(\.metric-grid\)[\s\S]*background: transparent/u, "Intelligence KPI grids must not paint unused columns.");
assert.match(css, /\.intelligence :global\(\.metric\)[\s\S]*border: 1px solid var\(--presentation-rule\)/u, "Intelligence KPI cards must own their visible boundary.");
assert.match(css, /\.command :global\(\.metric:first-child\)[\s\S]*presentation-accent/u, "Command surfaces need a governed decision accent.");
assert.match(css, /\.intelligence :global\(\.data-section:first-of-type\)[\s\S]*grid-column: 1 \/ -1/u, "Intelligence surfaces need a full-width primary analysis region.");
assert.match(css, /\.workflow :global\(\.available-actions\)[\s\S]*background: var\(--presentation-soft\)/u, "Workflow surfaces need an action-first decision rail.");
assert.match(css, /\.ledger :global\(table\)[\s\S]*font-variant-numeric: tabular-nums/u, "Ledger surfaces need stable financial/tabular numerics.");
assert.match(css, /\.catalogue :global\(\.data-section\)[\s\S]*border-top: 3px solid var\(--presentation-accent\)/u, "Catalogue surfaces need a strong governed collection boundary.");
assert.match(css, /\.tracking :global\(\.data-section\)[\s\S]*border-left: 3px solid var\(--presentation-accent\)/u, "Tracking surfaces need an explicit progress rail.");
assert.match(css, /\.documents :global\(\.data-section > header\)[\s\S]*background: var\(--presentation-soft\)/u, "Document surfaces need a distinct repository/document header treatment.");
assert.match(css, /\.regulated :global\(\.data-section\)[\s\S]*border-top: 2px solid #b4232e/u, "Regulated surfaces need a restrained safety boundary.");

assert.match(css, /\.command :global\(\.data-section:nth-of-type\(odd\):last-of-type\)/u, "Odd command/intelligence section counts must not leave a half-width orphan on desktop.");
assert.match(css, /\.catalogue :global\(\.table-region\)[\s\S]*max-height:[\s\S]*overflow: auto/u, "Desktop catalogue tables must be bounded and keyboard-scrollable.");
assert.match(css, /\.catalogue :global\(\.table-region th\)[\s\S]*position: sticky/u, "Bounded catalogue tables must retain visible column context with sticky headers.");
assert.match(css, /@media \(max-width: 620px\)/u, "Presentation archetypes must retain a mobile composition contract.");
assert.doesNotMatch(css, /animation:|transition:/u, "Module presentation refinement must not add ornamental motion outside the global reduced-motion contract.");

const counts = Object.fromEntries([...allowed].map((archetype) => [archetype, Object.values(presentations).filter((value) => value === archetype).length]));
console.log(JSON.stringify({
  governedModules: catalog.length,
  archetypes: counts,
  roleLevelHierarchy: true,
  activeOnlySidebarStatus: true,
  compactTruthRail: true,
  authenticatedDashboardPreserved: true,
  presentationAppliedOutsideSecurityBoundary: true,
  emptyMetricColumnsStayWhitespace: true,
  oddCommandSectionsSpan: true,
  boundedDesktopCatalogue: true,
}, null, 2));