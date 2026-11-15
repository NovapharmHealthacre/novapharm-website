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
});

test("custom SwiftUI code is a reference, not a web runtime dependency", () => {
  for (const file of ["apps/corporate/app/layout.tsx", "apps/portal/app/layout.tsx", "apps/technology/app/layout.tsx"]) {
    assert.doesNotMatch(read(file), /SwiftUI|\.dmg|\.xcframework/);
  }
});
