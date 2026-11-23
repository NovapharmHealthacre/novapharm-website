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

const approvedNeutrals = JSON.parse(read("config/brand-identities.json")).neutralPalette;
for (const [key, expected] of [["primaryWhite", "#FBFAEF"], ["secondaryWhite", "#F8F7F3"], ["defaultInk", "#0B0B0E"], ["subtleDivider", "#DEDCD5"]]) {
  assert.equal(approvedNeutrals[key].hex, expected, `${key} canonical brand neutral has drifted`);
}
const light = tokensFor(":root {");
const dark = tokensFor(':root[data-np-color-scheme="dark"] {');
assert.equal(light["--np-color-label"], "#0b0b0e", "Official website label ink must be Sovereign Black");
assert.equal(light["--np-color-canvas"], "#fbfaef", "Primary neutral canvas must be Royal Mineral White");
assert.equal(light["--np-color-surface"], "#f8f7f3", "Secondary neutral must be Royal Porcelain White");
assert.equal(light["--np-color-separator"], "#dedcd5", "Decorative separator must be Porcelain Stone");
assert.equal(light["--np-color-surface-raised"], "#f8f7f3", "Raised neutral must use Royal Porcelain White");
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
// The shared React design system is part of the same brand identity.
const reactSystem = read("packages/design-system/src/index.ts");
const reactStyles = read("packages/design-system/src/styles.ts");
for (const [label, hex] of [
  ["warmWhite", officialNeutrals.primary],
  ["porcelainWhite", officialNeutrals.secondary],
  ["sovereignBlack", officialNeutrals.black],
  ["porcelainStone", officialNeutrals.divider],
]) {
  assert.ok(reactSystem.includes(label + ': "' + hex + '"'),
    "Shared React design tokens must preserve " + label);
}
for (const [token, hex] of [
  ["--np-royal-canvas", officialNeutrals.primary],
  ["--np-royal-porcelain", officialNeutrals.secondary],
  ["--np-royal-ink", officialNeutrals.black],
  ["--np-royal-stone", officialNeutrals.divider],
]) {
  assert.ok(reactStyles.includes(token + ":" + hex),
    "Shared React component CSS must preserve " + token);
}
assert.match(reactStyles, /\.np-navigation\{[^}]*background:var\(--np-royal-canvas\)/);
assert.match(reactStyles, /\.np-button--secondary\{[^}]*border-color:var\(--np-royal-control-border\)/);

// Corporate default form inputs must have non-decorative control boundaries.
assert.ok(read("apps/corporate/app/globals.css").includes("border: 1px solid #86868B; border-radius: 2px; background: var(--white);"),
  "Corporate default form controls require visible border contrast");

// Contact is an Apple-style readable surface, while essential inputs remain visible.
const contactCss = read("assets/css/contact-premium.css");
assert.ok(contactCss.includes("--np-contact-ink: #0B0B0E"));
assert.ok(contactCss.includes("--np-contact-soft: #F8F7F3"));
assert.ok(contactCss.includes("background: #FBFAEF"));
assert.ok(contactCss.includes("--np-contact-control-line: var(--np-color-separator-strong, #86868B)"));
assert.ok(contactCss.includes("border: 1px solid var(--np-contact-control-line)"));
assert.ok(read("assets/css/novapharm.bundle.css").includes("/* Source: contact-premium.css */\n" + contactCss.trim()),
  "Public CSS bundle must include the complete updated Contact stylesheet");

// Royal Mineral and Porcelain are the visible Contact hero, footer and form surfaces.
assert.match(contactCss, /\.np-contact-reference-hero\s*\{[^}]*background:\s*#FBFAEF/);
assert.match(contactCss, /\.np-contact-reference-footer\s*\{[^}]*background:\s*#F8F7F3/);
assert.match(contactCss, /\.np-contact-reference-footer small\s*\{\s*font-size:\s*14px/);

// The separate dark Founder web estate uses Sovereign Black as its browser
// chrome while retaining intentional dark editorial surfaces and inverse text.
assert.match(read("apps/founder/app/layout.tsx"), /themeColor:\s*"#0B0B0E"/);
assert.match(read("apps/founder/app/manifest.ts"), /background_color:\s*"#0B0B0E"/);
assert.match(read("apps/founder/app/manifest.ts"), /theme_color:\s*"#0B0B0E"/);
assert.match(read("apps/founder/app/base.css"), /--ink:\s*#0B0B0E/i);

// The historical logo-kit token aliases must not revive retired Pure White.
const logoKitTokens = read("creative-assets/brand/novapharm-logo-asset-pack/06_brand_tokens/novapharm-brand-tokens.css");
const logoKitJson = JSON.parse(read("creative-assets/brand/novapharm-logo-asset-pack/06_brand_tokens/novapharm-brand-tokens.json"));
const brandIdentity = JSON.parse(read("config/brand-identities.json"));
assert.equal(logoKitJson.neutral.white, officialNeutrals.primary);
assert.equal(logoKitJson.neutral.primaryWhite, officialNeutrals.primary);
assert.equal(logoKitJson.neutral.secondaryWhite, officialNeutrals.secondary);
assert.equal(logoKitJson.neutral.divider, officialNeutrals.divider);
assert.equal(logoKitJson.neutral.black, officialNeutrals.black);
assert.equal(brandIdentity.neutralPalette.primaryWhite.hex, officialNeutrals.primary);
assert.equal(brandIdentity.neutralPalette.secondaryWhite.hex, officialNeutrals.secondary);
assert.equal(brandIdentity.neutralPalette.defaultInk.hex, officialNeutrals.black);
assert.equal(brandIdentity.neutralPalette.subtleDivider.hex, officialNeutrals.divider);
for (const [token,hex] of [
  ["--novapharm-white", officialNeutrals.primary],
  ["--novapharm-white-primary", officialNeutrals.primary],
  ["--novapharm-white-secondary", officialNeutrals.secondary],
  ["--novapharm-divider", officialNeutrals.divider],
  ["--novapharm-black", officialNeutrals.black],
]) {
  assert.ok(logoKitTokens.includes(token + ": " + hex + ";"), "Logo-kit CSS must match " + token);
}

// Late editorial transforms must not undo the canonical browser theme.
const aboutTransform = read("scripts/apply-about-editorial.mjs");
assert.ok(aboutTransform.includes('meta name="theme-color" content="#FBFAEF"'),
  "The post-build About transform must retain Royal Mineral White");
assert.ok(!aboutTransform.includes('meta name="theme-color" content="#FFFFFF"'),
  "The post-build About transform must never restore retired Pure White");

// Post-build release-gate validation is mandatory across the complete public
// canonical page register, not merely the checked-in homepage source.
const postBuildRoyal = read("scripts/validate-royal-public-theme.mjs");
assert.match(read("scripts/build-site.mjs"), /await import\("\.\/validate-royal-public-theme\.mjs"\)/);
assert.match(postBuildRoyal, /seo\/generated\/page-metadata-register\.json/);
assert.match(postBuildRoyal, /"\/distribution\/", "\/market-access\/", "\/markets\/"/);
const publicBuild = read("scripts/build-site.mjs");
assert.ok(publicBuild.indexOf('await import("./apply-global-distribution-foundation.mjs")') >= 0 &&
  publicBuild.indexOf('await import("./apply-global-distribution-foundation.mjs")') <
  publicBuild.indexOf('await import("./enhance-seo-authority.mjs")'),
  "Commercial pages must exist before canonical SEO registration");

assert.match(postBuildRoyal, /expected exactly one browser theme tag/);
assert.match(postBuildRoyal, /webManifest\.background_color/);
assert.match(postBuildRoyal, /products\/marketplace\/index\.html/);
assert.match(postBuildRoyal, /products\/track\/index\.html/);
assert.match(postBuildRoyal, /products\/esco\/bag\/index\.html/);
assert.match(postBuildRoyal, /portal\/index\.html/);
assert.match(postBuildRoyal, /404\.html/);


// Page-specific home, corporate and navigation material roles may not override
// the Royal light neutrals; preserve separate dark mode and inverse CTA text.
for (const [path, tokens] of [
  ["assets/css/homepage-editorial.css", ["--nph-ink: #0B0B0E", "--nph-silver: #F8F7F3", "--nph-line: #DEDCD5", "background: #FBFAEF"]],
  ["assets/css/novapharm-hig-materials.css", ["--np-material-navigation-solid: #FBFAEF", "--np-material-menu-solid: #F8F7F3", "--np-material-label: var(--np-color-label, #0B0B0E)"]],
  ["assets/css/corporate-product-discipline.css", ["--npd-white: #FBFAEF", "--npd-soft: #F8F7F3", "--npd-ink: #0B0B0E", "--npd-line: #DEDCD5", "--npd-line-strong: #86868B"]],
]) {
  const cssSource = read(path);
  for (const token of tokens) assert.ok(cssSource.includes(token), path + " must keep " + token);
  assert.ok(read("assets/css/novapharm.bundle.css").includes("/* Source: " + path.split("/").pop() + " */\n" + cssSource.trim()),
    "Generated public bundle must match " + path);
}
assert.match(read("assets/css/novapharm-hig-materials.css"), /:root\[data-np-color-scheme="dark"\]/);

// The exact-release SHA must accompany late public shells too, not only SEO
// canonicals. This is build provenance, not authenticated Portal access.
const releaseStamper = read("scripts/stamp-public-release-provenance.mjs");
assert.ok(releaseStamper.includes("for (const route of latePublicPages)"));
for (const late of [
  "products/marketplace/index.html",
  "products/track/index.html",
  "products/strategic-portfolio/index.html",
  "products/esco/bag/index.html",
  "portal/index.html",
  "404.html"
]) {
  assert.ok(releaseStamper.includes('"' + late + '"'), late + " must be covered by post-build source stamping");
}
assert.ok(releaseStamper.includes("register.some((record) => record.file === route)"));
// The shared pinned-descriptor helper now owns one-and-only-one SHA protection.
const pinnedStamper = read("scripts/lib/stamp-pinned-public-html.mjs");
assert.ok(releaseStamper.includes("stampPinnedPublicHtml(root, route, sha)"));
assert.ok(pinnedStamper.includes("Duplicate or missing release source provenance"));
assert.ok(pinnedStamper.includes("constants.O_RDWR | constants.O_NOFOLLOW"));
assert.ok(pinnedStamper.includes('readFileSync(fd, "utf8")'));
assert.ok(pinnedStamper.includes("writeSync(fd, bytes, written, bytes.length - written, written)"));

// Product pages can be sourced from prior generated HTML: SEO enhancement must
// normalise exactly one Royal Mineral browser theme for every canonical route.
const seoAuthority = read("scripts/enhance-seo-authority.mjs");
assert.ok(seoAuthority.includes("function normalizePublicTheme(html, file)"));
assert.ok(seoAuthority.includes("html = normalizePublicTheme(html, file);"));
assert.ok(seoAuthority.includes("Duplicate canonical browser theme tags"));
assert.ok(seoAuthority.includes('config/brand-neutrals.json'));
assert.doesNotMatch(seoAuthority.slice(seoAuthority.indexOf("function normalizePublicTheme"),
  seoAuthority.indexOf("function normalizePublicTheme") + 1100), /#E3120B|#FFFFFF/);

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
