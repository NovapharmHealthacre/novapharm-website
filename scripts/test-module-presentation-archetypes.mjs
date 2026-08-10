import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const catalog = JSON.parse(await readFile(resolve("packages/portal-contracts/src/module-catalog.json"), "utf8"));
const presentations = JSON.parse(await readFile(resolve("apps/portal/data/module-presentations.json"), "utf8"));
const wrapper = await readFile(resolve("apps/portal/components/dashboard.tsx"), "utf8");
const base = await readFile(resolve("apps/portal/components/dashboard-base.tsx"), "utf8");
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

assert.match(wrapper, /data-presentation=\{archetype\}/u);
assert.match(wrapper, /has no governed presentation archetype/u, "Unknown future modules must fail closed visually.");
assert.match(wrapper, /Dashboard as BaseDashboard/u, "Presentation wrapper must reuse the preserved authenticated dashboard.");
assert.match(base, /gatewayJson<\{ user: PortalUser \}>\("portal\/session"\)/u, "Preserved dashboard must retain authenticated session verification.");
assert.match(base, /protectedMutation/u, "Preserved dashboard must retain controlled mutation plumbing.");
assert.match(base, /enterprise\/modules\/\$\{encodeURIComponent\(module\.code\)\}/u, "Preserved dashboard must retain server-authorized module loading.");

const counts = Object.fromEntries([...allowed].map((archetype) => [archetype, Object.values(presentations).filter((value) => value === archetype).length]));
console.log(JSON.stringify({ governedModules: catalog.length, archetypes: counts, authenticatedDashboardPreserved: true }, null, 2));
