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

test("source-package quality exception is documented, not published as an image", () => {
  assert.match(brand.brands.intelligence.sourceIntegrityWarning, /zero bytes/);
  assert.ok(!Object.values(logos).some((file) => file.endsWith("dark-4096w.webp")));
});
