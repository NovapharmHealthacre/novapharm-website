import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// Source contracts for the main public image-heavy experiences. These do not
// replace visual acceptance on actual standard- and high-density devices.
// https://developer.apple.com/design/human-interface-guidelines/images
const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const pages = [
  "index.html",
  "about/index.html",
  "capabilities/index.html",
  "leadership/index.html",
  "oncology/index.html",
  "products/index.html",
  "products/nutraxin/index.html"
];

test("primary corporate image placements reserve a ratio and have alternative text", () => {
  for (const page of pages) {
    const images = [...read(page).matchAll(/<img\b[^>]*>/giu)].map(match => match[0]);
    assert.ok(images.length > 0, `${page}: expected visible imagery`);
    for (const image of images) {
      const src = image.match(/\bsrc\s*=\s*"([^"]+)"/iu)?.[1];
      const width = Number(image.match(/\bwidth\s*=\s*"(\d+)"/iu)?.[1]);
      const height = Number(image.match(/\bheight\s*=\s*"(\d+)"/iu)?.[1]);
      assert.ok(src?.startsWith("/assets/") || /^data:image\/webp;base64,[A-Za-z0-9+/=]+$/u.test(src ?? ""),\n        `${page}: image needs a governed local asset or approved inline WebP: ${image.slice(0, 180)}`);
      assert.match(image, /\balt\s*=\s*"[^"]*"/iu, `${page}: image alt must be explicitly present`);
      assert.ok(Number.isInteger(width) && width > 0, `${page}: image needs width for intrinsic aspect ratio`);
      assert.ok(Number.isInteger(height) && height > 0, `${page}: image needs height for intrinsic aspect ratio`);
    }
  }
});

test("image styling separates storytelling crops from uncut product packs", () => {
  const source = read("assets/css/sitewide-layout-integrity.css");
  const bundle = read("assets/css/novapharm.bundle.css");
  const products = read("assets/css/products-editorial.css");
  const marker = "/* Source: sitewide-layout-integrity.css */\n";
  assert.ok(bundle.includes(marker) && bundle.endsWith(source.trimEnd() + "\n"),
    "Shipped public CSS bundle must contain the current image layout source");
  assert.match(source, /npd-media-section figure > picture[\s\S]*?aspect-ratio: 16 \/ 9/);
  assert.match(source, /npd-media-section figure > picture > img[\s\S]*?object-fit: cover/);
  assert.match(source, /nx-collection[\s\S]*?\.nx-picture img,[\s\S]*?object-fit: contain/);
  assert.match(source, /esco-storefront \.esco-product-visual \.esco-product-image/);
  assert.match(products, /Apple HIG image-alignment correction/);
  assert.match(products, /np-products-panel-art-nutraxin img[\s\S]*?bottom: 0;[\s\S]*?object-fit: contain/);
  assert.doesNotMatch(source, /object-fit:\s*fill\b/, "Never stretch a photo or labelled pack to fit its frame");
});

test("high-density public imagery retains modern sources and fallbacks", () => {
  const home = read("index.html");
  const nutraxin = read("products/nutraxin/index.html");
  assert.match(home, /<source[^>]+\.avif[^>]*type="image\/avif"/);
  assert.match(home, /<img[^>]+supply-network-hero\.jpg/);
  assert.match(nutraxin, /srcset="[^"]*480w[^"]*800w/);
  assert.match(nutraxin, /<source[^>]+type="image\/avif"/);
});
