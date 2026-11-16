import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (name) => readFileSync(name, "utf8");

test("all Apple HIG menus and actions are canonical rules across seven estates", () => {
  const policy = read("packages/design-system/src/menu-actions-policy.ts");
  const index = read("packages/design-system/src/index.ts");
  const required = [
    "menus-and-actions", "activity-views", "buttons", "context-menus", "dock-menus",
    "edit-menus", "home-screen-quick-actions", "menus", "ornaments",
    "pop-up-buttons", "pull-down-buttons", "the-menu-bar", "toolbars", "toggles",
    "segmented-controls"
  ];
  for (const slug of required) {
    assert.ok(policy.includes("https://developer.apple.com/design/human-interface-guidelines/" + slug),
      "Missing HIG policy: " + slug);
  }
  assert.ok(policy.includes("https://developer.apple.com/design/human-interface-guidelines/privacy#Location-button"));
  for (const estate of ["corporate", "technology", "founder", "status", "portal", "intelligence", "distribution"]) {
    assert.ok(policy.includes('"' + estate + '"'), "Estate missing: " + estate);
  }
  assert.match(index, /export \* from "\.\/menu-actions-policy"/);
  assert.match(index, /export \* from "\.\/menu-actions"/);
  assert.match(policy, /exact deployed SHA/);
  assert.match(policy, /server/);
});

test("read-only WMS priority is a real consumer of shared segmented choice", () => {
  const src = read("apps/portal/components/wms-recorded-evidence-studio.tsx");
  const css = read("apps/portal/app/employee-distribution.css");
  assert.match(src, /import \{ SegmentedChoice \} from/);
  assert.match(src, /<SegmentedChoice name="recorded-exception-priority"/);
  assert.match(src, /setPriority\(value as PriorityFilter\)/);
  assert.doesNotMatch(src, /data-np-share-url|window\.confirm\(/);
  assert.match(src, /not confirmed 3PL incidents/);
  for (const token of [".np-segmented-choice__track", "min-block-size:44px",
    ":has(input:checked)", ":has(input:focus-visible)", "forced-colors:active"]) {
    assert.ok(css.includes(token), "Missing shared interaction style " + token);
  }
});

test("permanent PR template requires source review and cross-estate acceptance", () => {
  const template = read(".github/pull_request_template.md");
  assert.match(template, /Apple menus and actions policy/);
  assert.match(template, /activity views|context menus|selection|toolbars/i);
  assert.match(template, /deployed SHA/);
  const documentation = read("docs/design/apple-hig-menus-actions-20261116.md");
  for (const filename of ["AddHomeScreenQuickActions.zip", "AddingMenusAndShortcutsToTheMenuBarAndUserInterface.zip"]) {
    assert.ok(documentation.includes(filename), "Missing inspected sample: " + filename);
  }
  assert.match(documentation, /SharePublicLink/);
});
