import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path) => readFileSync(resolve(process.cwd(), path), "utf8");
const css = read("assets/css/novapharm-hig-colours.css");

function tokensFor(selector) {
  const index = css.indexOf(selector);
  assert.ok(index >= 0, `Missing appearance selector: ${selector}`);
  const start = css.indexOf("{", index);
  const end = css.indexOf("}", start);
  const block = css.slice(start + 1, end);
  return Object.fromEntries(
    [...block.matchAll(/(--np-color-[\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)]
      .map((match) => [match[1], match[2].toLowerCase()]),
  );
}

function luminance(hex) {
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}
function contrast(left, right) {
  const sorted = [luminance(left), luminance(right)].sort((a, b) => a - b);
  return (sorted[1] + 0.05) / (sorted[0] + 0.05);
}
function check(tokenMap, foreground, background, minimum = 4.5) {
  const actual = contrast(tokenMap[`--np-color-${foreground}`], tokenMap[`--np-color-${background}`]);
  assert.ok(
    actual >= minimum,
    `${foreground} on ${background}: ${actual.toFixed(2)}:1 < ${minimum}:1`,
  );
}

const light = tokensFor(":root {");
const dark = tokensFor(':root[data-np-color-scheme="dark"] {');
assert.equal(light["--np-color-label"], "#0b0b0e", "Official website label ink must be Sovereign Black");
assert.equal(light["--np-color-primary-action"], "#0b0b0e", "Neutral primary actions must use Sovereign Black");
assert.notEqual(dark["--np-color-label"], "#0b0b0e", "Dark appearance must retain visible reverse labels");
assert.match(read("assets/css/tokens.css"), /--np-brand-black:\s*#0B0B0E/i);
assert.match(read("apps/corporate/app/design-system.css"), /--nph-ink:\s*#0B0B0E/i);
assert.match(read("apps/portal/app/apple-pharma-portal.css"), /--portal-ink:\s*#0B0B0E/i);
assert.match(read("apps/portal/app/employee-distribution.css"), /#0B0B0E/i);
assert.match(read("apps/portal/components/intelligence-sign-in.module.css"), /--npi-ink:\s*#0B0B0E/i);
for (const palette of [light, dark]) {
  for (const foreground of [
    "label", "secondary-label", "tertiary-label", "placeholder",
    "link", "success", "warning", "destructive",
  ]) {
    check(palette, foreground, "canvas");
    check(palette, foreground, "surface");
  }
  check(palette, "accent-strong", "canvas");
  check(palette, "accent-strong", "surface");
  check(palette, "accent-strong", "surface-recessed");
  check(palette, "focus", "canvas", 3);
  check(palette, "separator-strong", "surface", 3);
  check(palette, "on-accent", "accent");
  check(palette, "on-primary-action", "primary-action");
  assert.notEqual(palette["--np-color-accent"], palette["--np-color-destructive"], "Brand and error must be distinct");
}
assert.match(css, /prefers-color-scheme:\s*dark/);
assert.match(css, /prefers-contrast:\s*more/);
assert.match(css, /forced-colors:\s*active/);
assert.match(css, /\[data-np-status="warning"\]/);
assert.match(css, /\[data-np-status="error"\]/);
assert.match(css, /\[data-np-colour-role="primary-action"\]/);

for (const [path, estate] of [
  ["apps/corporate/app/layout.tsx", "corporate"],
  ["apps/portal/app/layout.tsx", "portal"],
  ["apps/status/app/layout.tsx", "status"],
  ["apps/technology/app/layout.tsx", "technology"],
]) {
  const layout = read(path);
  assert.ok(layout.includes('novapharm-hig-colours.css'), `${path}: colour stylesheet not loaded`);
  assert.ok(layout.includes(`data-np-estate="${estate}"`), `${path}: estate scope missing`);
}
assert.match(read("scripts/build-css-bundle.mjs"), /novapharm-hig-colours\.css/);
assert.match(read("assets/css/novapharm.css"), /novapharm-hig-colours\.css/);
assert.match(read("apps/technology/styles/components-4.css"), /\.related-insights__grid a > span\s*\{\s*color:\s*var\(--red-deep\)/, "Related article labels must use contrast-safe brand text");
const packageJson = JSON.parse(read("package.json"));
assert.equal(packageJson.scripts["design:colours:validate"], "node scripts/test-apple-hig-colours.mjs");
assert.ok(packageJson.scripts.check.includes("design:colours:validate"), "Production check must enforce colour contract");

console.log("NovaPharm Apple HIG-inspired semantic colour contract passed: 2 appearance palettes, contrast, estate imports and CI wiring.");
