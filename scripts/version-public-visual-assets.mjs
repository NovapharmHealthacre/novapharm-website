import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

const version = "20261111-forensic-design-v3";
const pages = [
  ["index.html", []],
  ["capabilities/index.html", ["capabilities-editorial.css"]],
  ["oncology/index.html", ["oncology-editorial.css", "oncology-hope-v2.css"]],
  ["products/index.html", ["products-editorial.css"]]
];

for (const [page, extraStyles] of pages) {
  let html = readFileSync(page, "utf8");
  for (const stylesheet of ["novapharm.bundle.css", ...extraStyles]) {
    const href = `/assets/css/${stylesheet}`;
    const current = `href="${href}"`;
    const visualVersion = page === "capabilities/index.html" && stylesheet === "capabilities-editorial.css"
      ? "20261111-capabilities-approved-photo-v5"
      : page === "oncology/index.html" && stylesheet === "oncology-hope-v2.css"
        ? "20261113-hope-responsive-v6"
        : page === "products/index.html" && stylesheet === "products-editorial.css"
          ? "20261111-products-layout-v4"
          : version;
    const next = `href="${href}?v=${visualVersion}"`;
    if (html.includes(next)) continue;
    assert.equal(html.split(current).length - 1, 1, `${page}: required stylesheet should occur exactly once: ${href}`);
    html = html.replace(current, next);
  }
  assert.match(html, /<picture class="brand-logo"><img src="\/assets\/brand\/novapharm-healthcare-logo\.png"/, `${page}: official header logo missing`);
  writeFileSync(page, html, "utf8");
}
console.log("Versioned approved public CSS on Home, Capabilities, Oncology and Products.");
