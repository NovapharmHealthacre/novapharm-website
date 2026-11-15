import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const material = read("assets/css/novapharm-hig-materials.css");
const bundle = read("assets/css/novapharm.bundle.css");
const entry = read("assets/css/novapharm.css");
const builder = read("scripts/build-css-bundle.mjs");

for (const token of [
  "--np-material-navigation-solid", "--np-material-navigation-tint",
  "--np-material-menu-solid", "--np-material-content-solid",
  "--np-material-label", "prefers-reduced-transparency",
  "prefers-contrast", "forced-colors", "prefers-reduced-motion",
  'data-np-transparency="reduce"', "@supports", "backdrop-filter"
]) {
  assert.ok(material.includes(token), `Missing material/accessibility contract: ${token}`);
}
assert.ok(material.includes(".site-header.is-scrolled::before"), "Technology scrolled header must be scoped");
assert.ok(material.includes(".workspace-topbar"), "Portal topbar material is missing");
assert.ok(material.includes(".np-material-content"), "Opaque content contract is missing");
assert.ok(material.includes("backdrop-filter: none"), "Opaque accessibility fallback is missing");
assert.ok(entry.includes("novapharm-hig-materials.css"), "Legacy source entry must include material layer");
assert.ok(builder.includes('["novapharm-hig-materials.css", null]'), "Legacy bundle builder must load material last");
assert.ok(bundle.includes("/* Source: novapharm-hig-materials.css */"), "Regenerate committed legacy bundle");
assert.ok(bundle.includes("--np-material-navigation-solid"), "Generated legacy bundle lacks material tokens");

for (const root of ["corporate", "portal", "technology"]) {
  const layout = read(`apps/${root}/app/layout.tsx`);
  assert.ok(layout.includes('novapharm-hig-materials.css'), `${root} must load shared materials`);
  assert.ok(layout.indexOf('novapharm-hig-materials.css') > layout.indexOf('novapharm-hig-colours.css'),
    `${root} must load materials after colour tokens`);
}
const tokens = read("packages/design-system/src/index.ts");
const styles = read("packages/design-system/src/styles.ts");
assert.ok(tokens.includes("materials: Object.freeze("), "Shared design system material tokens missing");
assert.ok(styles.includes(".np-navigation,.np-mega-menu"), "Reusable navigation should use material semantics");
assert.ok(styles.includes("prefers-reduced-transparency"), "Reusable navigation needs solid accessibility fallback");
assert.ok(!material.includes("filter: blur("), "Never blur foreground labels");
console.log("Apple HIG Materials web contract: PASS");
