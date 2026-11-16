import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ColumnBrowser,
  ContentLockup,
  HierarchyExplorer,
  OutlineView,
  TextLabel,
  type HierarchyGroup,
} from "../src/index.ts";

const groups: readonly HierarchyGroup[] = [
  { id: "quality", label: "Quality", items: [
    { id: "lots", label: "Lot review", description: "Recorded evidence only", detail: "3PL approval pending", href: "/employee/quality/" },
    { id: "recalls", label: "Recall workflow", description: "Integration pending", status: "Integration required" },
  ] },
  { id: "fulfilment", label: "Fulfilment", items: [
    { id: "dispatch", label: "Dispatch evidence", description: "No signed POD available" },
  ] },
];

test("column browser starts with selected group and item, native buttons and governed link", () => {
  const html = renderToStaticMarkup(<ColumnBrowser label="WMS workspaces" groups={groups} />);
  assert.match(html, /aria-label="WMS workspaces: categories"/);
  assert.match(html, /aria-label="WMS workspaces: records"/);
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /<button type="button"/);
  assert.match(html, /Category width/);
  assert.match(html, /type="range"/);
  assert.match(html, /aria-valuetext="28% of browser width"/);
  assert.match(html, /np-hig-text-label--secondary/);
  assert.match(html, /Lot review/);
  assert.match(html, /3PL approval pending/);
  assert.match(html, /href="\/employee\/quality\/"/);
  assert.doesNotMatch(html, /role="tree"|role="grid"/);
});

test("outline preserves semantic group disclosure and integration boundaries", () => {
  const html = renderToStaticMarkup(<OutlineView label="Warehouse hierarchy" groups={groups} />);
  assert.match(html, /<section class="np-hig-outline" aria-label="Warehouse hierarchy">/);
  assert.match(html, /<details open=""/);
  assert.match(html, /<summary>/);
  assert.match(html, /2 records/);
  assert.match(html, /Integration required/);
  assert.match(html, /<ul>/);
});

test("default outline remains available without JavaScript and both modes are present", () => {
  const html = renderToStaticMarkup(<HierarchyExplorer label="Warehouse" groups={groups} />);
  assert.match(html, /role="group" aria-label="Warehouse display"/);
  assert.match(html, /aria-pressed="false">Columns/);
  assert.match(html, /aria-pressed="true">Outline/);
  assert.match(html, /class="np-hig-column-browser"/);
  assert.match(html, /class="np-hig-outline"/);
  assert.match(html, /hidden=""/);
});

test("lockups contain one accessible destination instead of nested buttons and links", () => {
  const html = renderToStaticMarkup(<ContentLockup href="/products/" title="Product collection"
    subtitle="Available products" footer="Open catalogue" media={<img src="/approved.webp" alt="Approved product pack" />} />);
  assert.match(html, /<a class="np-hig-lockup" href="\/products\/">/);
  assert.match(html, /Product collection/);
  assert.match(html, /alt="Approved product pack"/);
  assert.equal((html.match(/<a\b/g) ?? []).length, 1);
  assert.equal((html.match(/<button\b/g) ?? []).length, 0);
});

test("empty hierarchy exposes a readable status instead of blank panes", () => {
  assert.match(renderToStaticMarkup(<ColumnBrowser label="Documents" groups={[]} />), /No categories are available/);
  assert.match(renderToStaticMarkup(<OutlineView label="Documents" groups={[]} />), /No categories are available/);
});

test("static labels remain selectable and use semantic neutral prominence", () => {
  const primary = renderToStaticMarkup(<TextLabel>Important source</TextLabel>);
  const secondary = renderToStaticMarkup(<TextLabel tone="secondary">Supporting detail</TextLabel>);
  assert.match(primary, /np-hig-text-label--primary/);
  assert.match(secondary, /np-hig-text-label--secondary/);
  assert.match(secondary, /Supporting detail/);
});
