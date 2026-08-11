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

assert.match(portalClient, /data-presentation=\{archetype\}/u);
assert.match(portalClient, /has no governed presentation archetype/u, "Unknown future modules must fail closed visually.");
assert.match(portalClient, /incomplete presentation stylesheet contract/u, "Missing CSS archetypes must fail closed rather than render generic UI.");
assert.match(portalClient, /<Dashboard module=\{module\}/u, "Presentation layer must wrap the existing authenticated Dashboard rather than replace it.");

assert.match(dashboard, /gatewayJson<\{ user: PortalUser \}>\("portal\/session"\)/u, "Authenticated Dashboard must retain session verification.");
assert.match(dashboard, /protectedMutation/u, "Authenticated Dashboard must retain controlled mutation plumbing.");
assert.match(dashboard, /enterprise\/modules\/\$\{encodeURIComponent\(module\.code\)\}/u, "Authenticated Dashboard must retain server-authorized module loading.");
assert.doesNotMatch(dashboard, /module-presentations/u, "Presentation concerns must stay outside the security/data-fetch component.");

assert.match(css, /\.command :global\(\.data-section:nth-of-type\(odd\):last-of-type\)/u, "Odd command/intelligence section counts must not leave a half-width orphan on desktop.");
assert.match(css, /\.catalogue :global\(\.table-region\)[\s\S]*max-height:[\s\S]*overflow: auto/u, "Desktop catalogue tables must be bounded and keyboard-scrollable.");
assert.match(css, /\.catalogue :global\(\.table-region th\)[\s\S]*position: sticky/u, "Bounded catalogue tables must retain visible column context with sticky headers.");
assert.match(css, /@media \(max-width: 620px\)/u, "Presentation archetypes must retain a mobile composition contract.");

const counts = Object.fromEntries([...allowed].map((archetype) => [archetype, Object.values(presentations).filter((value) => value === archetype).length]));
console.log(JSON.stringify({
  governedModules: catalog.length,
  archetypes: counts,
  authenticatedDashboardPreserved: true,
  presentationAppliedOutsideSecurityBoundary: true,
  oddCommandSectionsSpan: true,
  boundedDesktopCatalogue: true,
}, null, 2));
