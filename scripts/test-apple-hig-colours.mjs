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


/* Owner-approved neutral brand identity: permanent CI guardrails. */
const officialNeutrals = JSON.parse(read("config/brand-neutrals.json"));
assert.equal(officialNeutrals.primary, "#FBFAEF");
assert.equal(officialNeutrals.secondary, "#F8F7F3");
assert.equal(officialNeutrals.black, "#0B0B0E");
assert.equal(officialNeutrals.divider, "#DEDCD5");
assert.equal(officialNeutrals.version, 1);
function firstColour(path, token) {
  const source = read(path);
  const match = source.match(new RegExp("^[ \\t]*" + token + ":\\s*(#[0-9a-fA-F]{6})\\s*;", "m"));
  assert.ok(match, path + " missing " + token);
  return match[1].toUpperCase();
}
for (const file of ["assets/css/tokens.css", "assets/css/novapharm-hig-colours.css"]) {
  for (const [token, hex] of Object.entries({
    "--np-white-primary": officialNeutrals.primary,
    "--np-white-secondary": officialNeutrals.secondary,
    "--np-black-default": officialNeutrals.black,
    "--np-divider-subtle": officialNeutrals.divider,
  })) {
    assert.equal(firstColour(file, token), hex);
  }
}
for (const [token, hex] of Object.entries({
  "--np-color-canvas": officialNeutrals.primary,
  "--np-color-surface": officialNeutrals.secondary,
  "--np-color-surface-raised": officialNeutrals.secondary,
  "--np-color-label": officialNeutrals.black,
  "--np-color-separator": officialNeutrals.divider,
  "--np-color-on-accent": officialNeutrals.primary,
  "--np-color-on-primary-action": officialNeutrals.primary,
})) {
  assert.equal(firstColour("assets/css/novapharm-hig-colours.css", token), hex);
}
for (const [path, assignments] of [
  ["assets/css/tokens.css", { "--paper": officialNeutrals.primary, "--surface": officialNeutrals.secondary, "--ink": officialNeutrals.black, "--line": officialNeutrals.divider }],
  ["apps/corporate/app/design-system.css", { "--nph-canvas": officialNeutrals.primary, "--nph-silver": officialNeutrals.secondary, "--nph-ink": officialNeutrals.black, "--nph-line": officialNeutrals.divider }],
  ["apps/portal/app/apple-pharma-portal.css", { "--portal-white": officialNeutrals.primary, "--portal-soft": officialNeutrals.secondary, "--portal-ink": officialNeutrals.black, "--portal-line": officialNeutrals.divider }],
  ["apps/status/app/globals.css", { "--white": officialNeutrals.primary, "--soft": officialNeutrals.secondary, "--ink": officialNeutrals.black, "--line": officialNeutrals.divider }],
  ["apps/technology/styles/base-1.css", { "--paper": officialNeutrals.primary, "--paper-bright": officialNeutrals.secondary, "--ink": officialNeutrals.black }],
]) {
  for (const [token, hex] of Object.entries(assignments)) {
    assert.equal(firstColour(path, token), hex);
  }
}
for (const path of [
  "apps/corporate/app/layout.tsx",
  "apps/portal/app/layout.tsx",
  "apps/technology/app/layout.tsx",
  "apps/status/app/layout.tsx",
]) {
  assert.match(read(path), /themeColor:\s*"#FBFAEF"/);
}
assert.match(read("assets/css/novapharm.bundle.css"), /--np-color-canvas:\s*#FBFAEF/);
assert.match(read("assets/css/novapharm.bundle.css"), /--np-color-surface:\s*#F8F7F3/);
assert.ok(contrast(officialNeutrals.black, officialNeutrals.primary) >= 7);
assert.ok(contrast(officialNeutrals.black, officialNeutrals.secondary) >= 7);
assert.ok(contrast(officialNeutrals.primary, light["--np-color-accent"]) >= 4.5);
// Keep authored HTML and the build-time generators aligned: rebuilding the
// static estate must not resurrect the retired pure-white page background.
for (const path of [
  "index.html",
  "scripts/build-public-pages.mjs",
  "scripts/build-pages.mjs",
]) {
  assert.ok(read(path).includes('meta name="theme-color" content="#FBFAEF"'),
    path + " must use the official Royal Mineral browser theme");
}
assert.match(read("scripts/build-public-pages.mjs"), /background_color:\s*"#FBFAEF"/);
assert.equal(JSON.parse(read("manifest.webmanifest")).background_color, officialNeutrals.primary);

// Apple HIG and WCAG non-text contrast: visible control edges are separate
// from the official low-contrast Porcelain Stone divider.
for (const [path, token, controlSelector] of [
  ["apps/corporate/app/design-system.css", "--nph-control-line", ".mobile-menu summary"],
  ["apps/portal/app/apple-pharma-portal.css", "--portal-control-line", ".access-selector label"],
]) {
  const style = read(path);
  assert.ok(style.includes(token + ": var(--np-color-separator-strong, #86868B)"), path + " must define a strong control border");
  assert.ok(style.includes(controlSelector), path + " must style the named control");
  assert.ok(style.includes("border-color: var(" + token + ")"), path + " must apply its strong border");
}
assert.ok(contrast(light["--np-color-separator-strong"], officialNeutrals.secondary) >= 3,
  "Control edge must achieve WCAG 2.2 non-text contrast against Porcelain White");

// This low-contrast Stone hairline is decorative, not a form/control outline.
assert.ok(contrast(officialNeutrals.divider, officialNeutrals.primary) < 3);
check(light, "separator-strong", "surface", 3);

console.log("NovaPharm Apple HIG-inspired semantic colour contract passed: 2 appearance palettes, contrast, estate imports and CI wiring.");
