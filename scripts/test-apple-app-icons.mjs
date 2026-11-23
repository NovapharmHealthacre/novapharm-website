import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file));
const text = (file) => read(file).toString("utf8");
const failures = [];
const check = (name, fn) => {
  try { fn(); console.log(`PASS ${name}`); }
  catch (error) { failures.push(`${name}: ${error.message}`); console.error(`FAIL ${name}: ${error.message}`); }
};
const attr = (element, name) => element.match(new RegExp(`\\b${name}="([^"]+)"`, "u"))?.[1];
const svgPaths = (svg) => [...svg.matchAll(/<path\b[\s\S]*?\/>/gu)].map((match) => match[0]);
const pngSize = (file) => {
  const data = read(file);
  assert.equal(data.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", `${file}: PNG signature`);
  assert.equal(data.subarray(12, 16).toString("ascii"), "IHDR", `${file}: PNG IHDR`);
  return [data.readUInt32BE(16), data.readUInt32BE(20)];
};
const approved = text("assets/brand/favicon.svg");
const sourcePaths = svgPaths(approved);

check("two approved brand silhouette paths", () => {
  assert.equal(sourcePaths.length, 2);
  assert.match(approved, /#9D1B32/iu);
});

for (const [index, file] of [
  "creative-assets/icon-composer/novapharm-healthcare/01-novapharm-monogram.svg",
  "creative-assets/icon-composer/novapharm-healthcare/02-novapharm-continuum-arc.svg",
].entries()) {
  check(`unmasked approved vector layer ${index + 1}`, () => {
    const svg = text(file);
    assert.match(svg, /width="1024" height="1024" viewBox="0 0 1024 1024"/u);
    assert.doesNotMatch(svg, /<script\b|<rect\b|<mask\b|<filter\b|<image\b|<text\b|(?:href|src)="https?:/iu);
    const layerPaths = svgPaths(svg);
    assert.equal(layerPaths.length, 1);
    assert.equal(attr(layerPaths[0], "d"), attr(sourcePaths[index], "d"), "shape path must be byte-identical");
    assert.equal(attr(layerPaths[0], "transform") ?? "", attr(sourcePaths[index], "transform") ?? "", "approved transform must be preserved");
    assert.equal(attr(layerPaths[0], "fill"), "#FFFFFF");
  });
}

check("native master artwork dimensions", () => {
  for (const file of [
    "creative-assets/brand/novapharm-logo-asset-pack/04_apple_app_icons/AppIcon/AppIcon-1024x1024.png",
    "creative-assets/brand/novapharm-logo-asset-pack/04_apple_app_icons/AppIcon/novapharm-app-icon-default-1024.png",
    "creative-assets/brand/novapharm-logo-asset-pack/04_apple_app_icons/AppIcon/novapharm-app-icon-dark-1024.png",
  ]) assert.deepEqual(pngSize(file), [1024, 1024], file);
});

const webIcons = [
  ["/assets/brand/apple-touch-icon.png", 180],
  ["/assets/brand/pwa-icon-192.png", 192],
  ["/assets/brand/pwa-icon-512.png", 512],
  ["/assets/brand/pwa-maskable-512.png", 512],
];
check("approved web and PWA icon sizes", () => {
  for (const [src, expected] of webIcons) assert.deepEqual(pngSize(src.slice(1)), [expected, expected], src);
  const favicon = text("assets/brand/favicon.svg");
  assert.match(favicon, /viewBox="0 0 1024 1024"/u);
  assert.ok(read("assets/brand/favicon.ico").length > 100);
  assert.ok(read("assets/brand/safari-pinned-tab.svg").length > 100);
});

check("static site icon declarations and manifest", () => {
  const index = text("index.html");
  for (const snippet of [
    'href="/assets/brand/favicon.svg"',
    'href="/assets/brand/favicon.ico"',
    'href="/assets/brand/apple-touch-icon.png"',
    'href="/assets/brand/safari-pinned-tab.svg"',
    'href="/manifest.webmanifest"',
  ]) assert.ok(index.includes(snippet), `missing static HTML reference ${snippet}`);
  const manifest = JSON.parse(text("manifest.webmanifest"));
  assert.equal(manifest.name, "NovaPharm Healthcare");
  assert.equal(manifest.theme_color.toUpperCase(), "#9D1B32");
  for (const [src, expected] of webIcons.slice(1)) {
    const item = manifest.icons.find((icon) => icon.src === src);
    assert.ok(item, `missing manifest icon ${src}`);
    assert.equal(item.sizes, `${expected}x${expected}`);
    assert.equal(item.type, "image/png");
    assert.equal(item.purpose, src.includes("maskable") ? "maskable" : "any");
  }
});

check("corporate Next.js site uses the same governed icon references", () => {
  const layout = text("apps/corporate/app/layout.tsx");
  const manifest = text("apps/corporate/app/manifest.ts");
  for (const icon of ["favicon.svg", "favicon.ico", "apple-touch-icon.png"]) {
    assert.ok(layout.includes(`/assets/brand/${icon}`), `missing metadata icon ${icon}`);
  }
  for (const [src] of webIcons.slice(1)) assert.ok(manifest.includes(src), `missing Next.js manifest icon ${src}`);
});

check("other NovaPharm properties retain their own approved identities", () => {
  assert.match(text("apps/technology/app/layout.tsx"), /\/assets\/NIT-logo\.svg/u);
  assert.match(text("apps/founder/app/layout.tsx"), /\/favicon\.svg/u);
  assert.match(text("apps/portal/app/layout.tsx"), /\/assets\/brand\/favicon\.svg/u);
  assert.match(text("apps/status/app/layout.tsx"), /\/assets\/brand\/favicon\.svg/u);
});

if (failures.length) {
  console.error(`Apple icon contract: ${failures.length} failure(s)`);
  process.exitCode = 1;
} else console.log("Apple app/icon web-adaptation contract passed; native Xcode and production release remain separate gates.");
