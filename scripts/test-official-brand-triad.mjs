import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

const text = (path) => readFileSync(path, "utf8");
const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const brand = JSON.parse(text("config/brand-identities.json"));
const logos = {
  healthcare: "assets/brand/novapharm-healthcare-logo.svg",
  distribution: "assets/brand/novapharm-distribution-logo.svg",
  intelligence: "assets/brand/novapharm-intelligence-logo.svg",
};
const icons = {
  healthcare: "assets/brand/favicon.svg",
  distribution: "assets/brand/novapharm-distribution-favicon.svg",
  intelligence: "assets/brand/novapharm-intelligence-favicon.svg",
};

test("three separate owner-approved entities and sRGB colours", () => {
  assert.equal(brand.approvedOn, "2026-11-22");
  assert.deepEqual(
    Object.entries(brand.brands).map(([key, value]) => [key, value.hex]),
    [["healthcare", "#9D1B32"], ["distribution", "#3D0B13"], ["intelligence", "#2546D8"]],
  );
  assert.equal(Object.values(brand.brands).reduce((sum, item) => sum + item.sourceZipFiles, 0), 695);
});

for (const [key, filename] of Object.entries(logos)) {
  test(key + ": primary wordmark is the correct vector and colour", () => {
    const source = text(filename);
    assert.match(source, /<svg\b/);
    assert.match(source, /<path\b/);
    assert.ok(source.includes(brand.brands[key].hex), filename + ": incorrect approved HEX");
    assert.doesNotMatch(source, /<script\b|<foreignObject\b|javascript:|<image\b/i);
    assert.doesNotMatch(source, /#E3120B|#B30E09/i);
    assert.doesNotMatch(source, /<text\b/i, "live text would depend on a runtime font");
  });
  test(key + ": app/small-format symbol preserves exact uploaded SVG bytes", () => {
    assert.equal(sha256(icons[key]), brand.brands[key].browserIconZipSha256);
  });
}

test("Healthcare and Intelligence primary vector bytes match uploaded packages", () => {
  assert.equal(sha256(logos.healthcare), brand.brands.healthcare.primaryVectorZipSha256);
  assert.equal(sha256(logos.intelligence), brand.brands.intelligence.primaryVectorZipSha256);
  assert.equal(sha256(logos.distribution), brand.brands.distribution.primaryVectorZipSha256);
});

test("Intelligence historical approved vector retained and new blue replaces public secure entry", () => {
  assert.ok(text("assets/brand/novapharm-intelligence-approved.svg").includes("#657486"));
  assert.match(text("apps/portal/components/intelligence-sign-in.tsx"), /novapharm-intelligence-logo\.svg/);
  assert.match(text("native/novapharm-intelligence-ios/App/NovaTheme.swift"), /red: 37\.0 \/ 255, green: 70\.0 \/ 255, blue: 216\.0 \/ 255/);
  assert.match(text("native/novapharm-intelligence-android/app/src/main/res/values/colors.xml"), /#2546D8/);
});

test("Corporate and Distribution views do not borrow each other's logo", () => {
  assert.match(text("apps/corporate/components/brand.tsx"), /novapharm-healthcare-logo\.svg/);
  assert.match(text("apps/portal/components/portal-brand.tsx"), /novapharm-healthcare-logo/);
  assert.match(text("apps/portal/components/distribution-brand.tsx"), /novapharm-distribution-logo\.svg/);
  assert.match(text("apps/portal/app/employee-distribution.css"), /#3D0B13/);
});

test("outdated Economist Red not used by shared corporate or portal accent tokens", () => {
  for (const file of ["assets/css/tokens.css", "assets/css/base.css", "apps/corporate/app/globals.css", "apps/portal/app/globals.css", "apps/portal/app/apple-pharma-portal.css"]) {
    assert.doesNotMatch(text(file), /#E3120B|#B30E09/i, file);
  }
  assert.equal(JSON.parse(text("manifest.webmanifest")).theme_color, "#9D1B32");
});

test("generated light social artwork uses the approved Royal Mineral White, not legacy Pure White", () => {
  const renderer = text("scripts/programme/rebuild-three-brand-derivatives.mjs");
  assert.equal(brand.neutralPalette.primaryWhite.hex, "#FBFAEF");
  assert.equal(brand.neutralPalette.secondaryWhite.hex, "#F8F7F3");
  assert.equal(brand.neutralPalette.subtleDivider.hex, "#DEDCD5");
  assert.equal(brand.neutralPalette.defaultInk.hex, "#0B0B0E");
  assert.match(renderer, /officialLight=identities\.neutralPalette\?\.primaryWhite\?\.hex/);
  assert.match(renderer, /social\(primary,reverse,officialLight,false\)/);
  assert.doesNotMatch(renderer, /social\(primary,reverse,"#FFFFFF",false\)/);
});

test("generated public CSS bundle mirrors the owner-approved Royal neutrals", () => {
  const bundle = text("assets/css/novapharm.bundle.css");
  assert.match(bundle, /--np-brand-white-primary:\s*#FBFAEF/i);
  assert.match(bundle, /--np-brand-white-secondary:\s*#F8F7F3/i);
  assert.match(bundle, /--np-brand-divider:\s*#DEDCD5/i);
  const lightStart = bundle.indexOf(":root {\n  color-scheme: light;");
  assert.ok(lightStart >= 0, "Missing generated HIG light palette block");
  const lightBody = bundle.slice(lightStart, bundle.indexOf("}", lightStart));
  for (const [token, hex] of [
    ["canvas", "#FBFAEF"],
    ["surface", "#F8F7F3"],
    ["surface-raised", "#F8F7F3"],
    ["label", "#0B0B0E"],
    ["separator", "#DEDCD5"],
  ]) {
    assert.match(lightBody, new RegExp(`--np-color-${token}:\\s*${hex}`, "i"),
      "Bundled " + token + " diverges from approved source palette");
  }
});

test("public release validates current owner-approved SHA provenance and PWA colours", () => {
  const validator = text("scripts/validate-site.mjs");
  const manifest = JSON.parse(text("manifest.webmanifest"));
  assert.ok(validator.includes("config/brand-identities.json"));
  assert.ok(validator.includes("audit/generated/three-brand-raster-provenance.json"));
  assert.ok(validator.includes('createHash("sha256")'));
  assert.ok(validator.includes("hash !== expectedHash"));
  assert.doesNotMatch(validator, /#E3120B|9199250e117b5c7d2b39d4d08d33522928f668d36316863b4e60f5eb7ca2a729/i);
  assert.equal(manifest.theme_color, brand.brands.healthcare.hex);
  assert.equal(manifest.background_color, brand.neutralPalette.primaryWhite.hex);
});

test("public and protected page generators cannot restore retired pure-white browser surfaces", () => {
  const publicBuild = text("scripts/build-public-pages.mjs");
  const protectedBuild = text("scripts/build-pages.mjs");
  assert.ok(publicBuild.includes('background_color: "#FBFAEF"'));
  assert.ok(publicBuild.includes('meta name="theme-color" content="#FBFAEF"'));
  assert.ok(protectedBuild.includes('meta name="theme-color" content="#FBFAEF"'));
  assert.doesNotMatch(publicBuild, /background_color: "#ffffff"/i);
  assert.doesNotMatch(publicBuild, /meta name="theme-color" content="#FFFFFF"/i);
  assert.doesNotMatch(protectedBuild, /meta name="theme-color" content="#FFFFFF"/i);
});

test("generated Portal logo uses exact owner SVG and real PNG raster fallback", () => {
  const builder = text("scripts/build-pages.mjs");
  assert.ok(builder.includes('const brandLogoSvg = "/assets/brand/novapharm-healthcare-logo.svg";'));
  assert.ok(builder.includes('const brandLogoPng = "/assets/brand/novapharm-healthcare-logo.png";'));
  assert.ok(builder.includes('srcset="${brandLogoSvg}" type="image/svg+xml"'));
  assert.ok(builder.includes('src="${brandLogoPng}" alt="NovaPharm Healthcare"'));
  assert.notEqual(brand.brands.healthcare.primaryVector, "/assets/brand/novapharm-healthcare-logo.png");
});

test("Portal navigation status and warehouse source disclaimer preserve accessible ink", () => {
  const portal = text("apps/portal/app/apple-pharma-portal.css");
  const warehouse = text("apps/portal/app/employee-distribution.css");
  assert.ok(portal.includes(".workspace-sidebar nav a.active > small {"));
  assert.ok(portal.includes("color: #0B0B0E;"));
  assert.ok(warehouse.includes(".distribution-wms-workspace-map-disclaimer{font-size:.8rem;color:#595961;"));
  assert.ok(!warehouse.includes(".distribution-wms-workspace-map-disclaimer{font-size:.8rem;color:#73737a;"));
});

test("source-package quality exception is documented, not published as an image", () => {
  assert.match(brand.brands.intelligence.sourceIntegrityWarning, /zero bytes/);
  assert.ok(!Object.values(logos).some((file) => file.endsWith("dark-4096w.webp")));
});


const approvedVariantDigests = Object.freeze({
  "assets/brand/novapharm-healthcare-logo-reverse.svg": "2aa3e14774fed64bd9454ed52ec3ca24a5dfa3b7477689093284c71eeebdf6f2",
  "assets/brand/novapharm-healthcare-logo-monochrome.svg": "598b755d89d0db65ed9929a260d829aebaa68c476cd4e51a33f0b3a8b8d68d0f",
  "assets/brand/novapharm-distribution-logo-reverse.svg": "ad4836f70ff23b66d5f213ed5188862628c41c918c451d7f709ab1baa1c2c036",
  "assets/brand/novapharm-distribution-logo-monochrome.svg": "85e296f76cb1534112c34ad04ee97f4a93c5a034f40239ea57499795dd66f2e1",
  "assets/brand/novapharm-intelligence-logo-reverse.svg": "0fc0272d8ab5c441193959f4afa3bac7939a5ca02ab706d5fb67c78cd6c62e1f",
  "assets/brand/novapharm-intelligence-logo-monochrome.svg": "9a408c1b98e91035b01fb6ef4e01a893047e26252443c946ba7d22538eaa805e",
  "assets/brand/safari-pinned-tab.svg": "5b82c63380e89fd83dc01596f4f76bcd84304e0b25581bba254f146cacbb262f",
});
for (const [file, digest] of Object.entries(approvedVariantDigests)) {
  test("owner ZIP byte-exact logo and browser vector: " + file, () => {
    assert.equal(sha256(file), digest, "Only the exact approved ZIP master may be published");
    assert.doesNotMatch(text(file), /<script\b|<foreignObject\b|javascript:/i);
  });
}
test("Sovereign Black and native font roles are independent of brand accents", () => {
  const system = JSON.parse(text("config/brand-identities.json"));
  assert.equal(system.brands.healthcare.hex, "#9D1B32");
  assert.equal(system.brands.distribution.hex, "#3D0B13");
  assert.equal(system.brands.intelligence.hex, "#2546D8");
  assert.match(text("assets/css/tokens.css"), /--np-brand-black:\s*#0B0B0E/i);
  assert.match(text("apps/corporate/app/globals.css"), /font-family:\s*var\(--np-type-ui/);
  assert.match(text("apps/portal/app/apple-pharma-portal.css"), /--portal-ink:\s*#0B0B0E/i);
  assert.doesNotMatch(text("assets/css/tokens.css"), /@font-face\s*\{[^}]*SF Pro/is);
});

test("registered three-brand image provenance stays SHA-bound and cannot be inferred", () => {
  const generator = text("scripts/programme/generate-image-inventory.mjs");
  assert.match(generator, /const officialBrand = await json\("config\/brand-identities\.json"\)/);
  assert.match(generator, /const brandRasterEvidence = await json\("audit\/generated\/three-brand-raster-provenance\.json"\)/);
  assert.match(generator, /actualSha !== expectedSha/);
  assert.match(generator, /createHash\("sha256"\)\.update\(bytes\)\.digest\("hex"\) !== item\.sha256/);
  assert.match(generator, /owner-approved-byte-exact-vector-source/);
  assert.match(generator, /source-linked-derived-raster-with-verified-sha256/);
  assert.match(generator, /registry\.get\(assetPath\)\?\.source/);
  assert.match(generator, /approvedRasterPath/);
  assert.doesNotMatch(generator, /provenanceStatus\s*=\s*"registered"\s*;/);
});
