import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (path) => readFileSync(path, "utf8");

test("hierarchy layouts are exported and retain semantic keyboard and disclosure controls", () => {
  const src = read("packages/design-system/src/layout-organization.tsx");
  const exports = read("packages/design-system/src/index.ts");
  for (const component of ["ColumnBrowser", "OutlineView", "HierarchyExplorer", "ContentLockup"]) {
    assert.match(src, new RegExp(`export function ${component}\\(`));
  }
  assert.match(exports, /export \* from "\.\/layout-organization"/);
  assert.match(src, /onKeyDown=\{focusAdjacent\}/);
  assert.match(src, /aria-pressed/);
  assert.match(src, /useState<"columns" \| "outline">\("outline"\)/, "No-script default must show every hierarchy group through native disclosures");
  assert.match(src, /<details open=\{index === 0\}>/);
  assert.doesNotMatch(src, /dangerouslySetInnerHTML|localStorage|fetch\(|role="tree"/);
});

test("WMS 16-capability mapping is navigable without inventing physical stock permissions", () => {
  const wms = read("apps/portal/components/wms-prototype-workspace-map.tsx");
  assert.equal((wms.match(/group: "/g) ?? []).length, 16);
  assert.match(wms, /HierarchyExplorer label="WMS workspace architecture"/);
  assert.match(wms, /href: entry\.module \? employeeRoutes\.get\(entry\.module\) : undefined/);
  assert.match(wms, /Physical warehouse stock remains unverified/);
  assert.match(wms, /not 16 activated warehouse services/);
});

test("hierarchical interfaces respect responsive and accessible presentation", () => {
  const css = read("assets/css/apple-hig-layout.css");
  for (const marker of [".np-hig-hierarchy-explorer", ".np-hig-column-browser", ".np-hig-outline",
    ".np-hig-lockup", ".np-hig-explorer-switch", "[aria-pressed=\"true\"]",
    "border-inline-start", "@media (max-width: 860px)", "@media (forced-colors: active)",
    "focus-visible", "min-block-size: 44px"]) {
    assert.ok(css.includes(marker), `Missing organization design contract: ${marker}`);
  }
  assert.doesNotMatch(css, /#E3120B|display:\s*none\s*;|position:\s*fixed\s*;/i);
  const bundle = read("assets/css/novapharm.bundle.css");
  assert.match(bundle, /Source: apple-hig-layout\.css/);
  assert.match(bundle, /\.np-hig-column-browser/);
});

test("portal module catalogue remains a governed set of 54 routes", () => {
  const modules = JSON.parse(read("packages/portal-contracts/src/module-catalog.json"));
  assert.equal(modules.length, 54);
  assert.equal(new Set(modules.map((entry) => entry.code)).size, 54);
});

test("all 33 owner-provided Apple links remain in the source matrix", () => {
  const doc = read("docs/design/apple-layout-source-matrix-20261116.md");
  const urls = new Set([...doc.matchAll(/https:\/\/developer\.apple\.com\/(?:design|documentation)\/[^\s)]+/g)].map((match) => match[0]));
  const patterns = [
    "layout-and-organization", "collections", "column-views", "disclosure-controls",
    "labels", "lists-and-tables", "lockups", "outline-views", "split-views", "tab-views",
  ];
  for (const slug of patterns) {
    assert.ok(urls.has(`https://developer.apple.com/design/human-interface-guidelines/${slug}`),
      `Missing Apple design guideline: ${slug}`);
  }
  const native = [
    "uikit/uicollectionview", "appkit/nscollectionview", "appkit/nsbrowser",
    "swiftui/disclosuregroup", "appkit/nsbutton/bezelstyle-swift.enum/disclosure",
    "appkit/nsbutton/bezelstyle-swift.enum/pushdisclosure",
    "swiftui/label", "swiftui/text", "uikit/uilabel", "appkit/nstextfield",
    "swiftui/list", "swiftui/tables", "uikit/uitableview", "appkit/nstableview",
    "tvuikit/tvlockupview", "tvuikit/tvlockupheaderfooterview",
    "swiftui/outlinegroup", "appkit/nsoutlineview",
    "swiftui/navigationsplitview", "uikit/uisplitviewcontroller", "appkit/nssplitviewcontroller",
    "swiftui/tabview", "appkit/nstabview",
  ];
  for (const path of native) {
    assert.ok(urls.has(`https://developer.apple.com/documentation/${path}`),
      `Missing native reference: ${path}`);
  }
  assert.equal(urls.size, 33, "Reconcile the exact owner-supplied Apple reference set.");
});

test("canonical design-system retains all ten organization choices across seven NovaPharm estates", () => {
  const policy = read("packages/design-system/src/layout-policy.ts");
  const index = read("packages/design-system/src/index.ts");
  assert.match(index, /export \* from "\.\/layout-policy"/);
  for (const key of [
    "collections", "columnViews", "disclosureControls", "labels", "listsAndTables",
    "lockups", "outlineViews", "splitViews", "tabViews", "overallLayout",
  ]) assert.match(policy, new RegExp(`\\b${key}: Object\\.freeze\\(\\{`), `Missing shared pattern: ${key}`);
  for (const estate of ["corporate", "technology", "founder", "status", "portal", "intelligence", "distribution"]) {
    assert.ok(policy.includes(`"${estate}"`), `Uncovered estate: ${estate}`);
  }
  assert.match(policy, /"authorized and denied"/);
});

test("disclosure marker, labelled resizing, selectable hierarchy text remain source-level invariants", () => {
  const css = read("assets/css/apple-hig-layout.css");
  const jsx = read("packages/design-system/src/layout-organization.tsx");
  assert.match(css, /\.np-hig-outline summary \{\s*display: list-item/);
  assert.match(css, /grid-template-columns: minmax\(0, var\(--np-hig-category-width/);
  assert.match(css, /\.np-hig-text-label \{ user-select: text/);
  assert.match(jsx, /aria-valuetext=/);
  assert.match(jsx, /type="range"/);
  assert.match(jsx, /export function TextLabel/);
});
