import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path) => readFileSync(resolve(process.cwd(), path), "utf8");
const css = read("assets/css/apple-hig-layout.css");

test("Apple HIG layout primitives preserve flow, safe areas, reflow and accessibility", () => {
  for (const marker of [
    "--np-layout-contract: 1", "grid-template-columns: repeat(auto-fit",
    "minmax(0, 1fr)", "min-inline-size: 0", "overflow-wrap: break-word",
    "env(safe-area-inset-left", "env(safe-area-inset-right",
    "min-block-size: var(--np-layout-touch)", "overflow-x: auto",
    "@media (max-width: 760px)", "@media (max-width: 420px)",
    "@media (prefers-reduced-motion: reduce)", "@media (forced-colors: active)"
  ]) assert.ok(css.includes(marker), `Missing layout contract: ${marker}`);
  assert.doesNotMatch(css, /@font-face|#E3120B|backdrop-filter|display:\s*none\s*;|position:\s*fixed\s*;/i);
});

test("all current web application shells import the shared layout without touching business logic", () => {
  for (const site of ["corporate", "portal", "technology", "status"]) {
    const layout = read(`apps/${site}/app/layout.tsx`);
    assert.match(layout, /import "\.\.\/\.\.\/\.\.\/assets\/css\/apple-hig-layout\.css";/,
      `Missing layout CSS in ${site} app shell`);
  }
});

test("static public pages use the same source in both CSS entrypoints", () => {
  assert.match(read("assets/css/novapharm.css"), /apple-hig-layout\.css/);
  assert.match(read("scripts/build-css-bundle.mjs"), /apple-hig-layout\.css/);
  const bundle = read("assets/css/novapharm.bundle.css");
  assert.match(bundle, /Source: apple-hig-layout\.css/);
  assert.match(bundle, /--np-layout-contract:\s*1/);
});

test("layout contract applies to the full portal catalogue, not just a showcase module", () => {
  const catalog = JSON.parse(read("packages/portal-contracts/src/module-catalog.json"));
  assert.equal(catalog.length, 54, "Portal scope changed; review all route families");
  assert.deepEqual([...new Set(catalog.map((entry) => entry.area))].sort(), ["admin", "customer", "employee", "executive"]);
  assert.match(css, /\.workspace-content/);
  assert.match(css, /\.np-intelligence/);
  const portal = read("apps/portal/components/dashboard.tsx");
  assert.match(portal, /className="metric-grid np-hig-grid"/);
  assert.match(portal, /className="table-region np-hig-table-region" tabIndex=\{0\}/);
  const intelligence = read("apps/portal/data/intelligence-workspaces.ts");
  assert.equal((intelligence.match(/slug: "/g) ?? []).length, 22, "Intelligence route catalogue changed");
});

test("custom SwiftUI code is a reference, not a web runtime dependency", () => {
  for (const file of ["apps/corporate/app/layout.tsx", "apps/portal/app/layout.tsx", "apps/technology/app/layout.tsx"]) {
    assert.doesNotMatch(read(file), /SwiftUI|\.dmg|\.xcframework/);
  }
});

test("generated public navigation has exactly one secure portal destination", () => {
  const source = read("src/content/site-content.mjs");
  const generator = read("scripts/build-public-pages.mjs");
  // The shared route register still includes the portal for other consumers.
  // Static public pages render it only once as a dedicated, discoverable link.
  assert.match(source, /\["Secure Portal", "\/portal\/"\]/);
  assert.match(generator, /navigation\.filter\(\(\[label\]\) => label !== "Secure Portal"\)\.map\(/);
  assert.match(generator, /<a class="nav-portal" href="https:\/\/portal\.novapharmhealthcare\.com\/">Secure portal<\/a>/);
});

test("public sitemap routes maintain accessible semantic structure and image metadata", () => {
  const sitemap = read("sitemap.xml");
  const slugs = [...sitemap.matchAll(/<loc>https:\/\/novapharmhealthcare\.com\/([^<]*)<\/loc>/g)]
    .map((match) => match[1]);
  assert.ok(slugs.length >= 57, "Unexpected public-route coverage reduction");
  assert.equal(new Set(slugs).size, slugs.length, "Duplicate canonical routes in public sitemap");

  for (const slug of slugs) {
    const path = slug ? `${slug}index.html` : "index.html";
    const html = read(path);
    const count = (pattern) => [...html.matchAll(pattern)].length;
    assert.equal(count(/<h1\b/gi), 1, `${path}: exactly one main heading required`);
    assert.equal(count(/<main\b/gi), 1, `${path}: exactly one main landmark required`);
    assert.match(html, /<html\b[^>]*\blang="en-GB"/i, `${path}: document language`);
    assert.match(html, /class="skip-link"\s+href="#main"/, `${path}: skip navigation`);
    assert.match(html, /<main\s+id="main"/, `${path}: skip target`);
    assert.equal(count(/rel="canonical"/gi), 1, `${path}: canonical URL`);

    const ids = [...html.matchAll(/(?:^|\s)id="([^"]+)"/gm)].map((match) => match[1]);
    assert.equal(new Set(ids).size, ids.length, `${path}: duplicate HTML IDs`);

    for (const image of html.match(/<img\b[^>]*>/gi) ?? []) {
      assert.match(image, /\balt="[^"]*"/i, `${path}: image alternative text`);
      const width = Number(image.match(/\bwidth="(\d+)"/i)?.[1]);
      const height = Number(image.match(/\bheight="(\d+)"/i)?.[1]);
      assert.ok(width > 0 && height > 0, `${path}: image intrinsic dimensions`);
    }
  }
});

test("homepage current-page semantics remain accurate", () => {
  const generator = read("scripts/apply-corporate-product-discipline.mjs");
  assert.match(generator, /function globalSection\(route\)\s*\{\s*if \(route === "\/"\) return "";/);
  const home = read("index.html");
  const nav = home.match(/<nav class="site-nav[^>]*>[\s\S]*?<\/nav>/)?.[0] ?? "";
  assert.ok(nav, "Home page needs a primary navigation landmark");
  assert.doesNotMatch(nav, /aria-current="page"/, "No section is the current page on the home route");
});
