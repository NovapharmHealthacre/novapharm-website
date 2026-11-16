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
  assert.match(index, /export \\* from "\\.\\/components"/);
  assert.match(read("packages/design-system/src/components.tsx"), /export \\* from "\\.\\/menu-actions"/);
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

test("all distinct user-supplied Apple framework references remain traceable", () => {
  const doc = read("docs/design/apple-hig-menus-actions-20261116.md");
  const prefix = "https://developer.apple.com/documentation/";
  const nativeRefs = [
    "uikit/uiactivityviewcontroller", "uikit/uiactivity", "foundation/app-extension-support",
    "swiftui/button", "uikit/uibutton", "appkit/nsbutton",
    "swiftui/view/contextmenu(menuitems:", "uikit/uicontextmenuinteraction",
    "appkit/nsmenu/popupcontextmenu(_:with:for:", "appkit/nsapplicationdelegate/applicationdockmenu(_:",
    "uikit/uieditmenuinteraction", "appkit/nsmenu", "uikit/add-home-screen-quick-actions",
    "swiftui/menu", "uikit/menus-and-shortcuts", "appkit/menus",
    "swiftui/view/ornament(visibility:attachmentanchor:contentalignment:ornament:",
    "swiftui/menupickerstyle", "uikit/uibutton/changesselectionasprimaryaction",
    "appkit/nspopupbutton", "uikit/uicontrol/showsmenuasprimaryaction",
    "appkit/nspopupbutton/pullsdown", "swiftui/commandmenu",
    "uikit/adding-menus-and-shortcuts-to-the-menu-bar-and-user-interface",
    "appkit/nsstatusbar", "swiftui/toolbars", "uikit/uitoolbar", "appkit/nstoolbar",
  ];
  for (const route of nativeRefs) {
    assert.ok(doc.includes(prefix + route), "Missing native API reference: " + route);
  }
  assert.ok(doc.includes("https://developer.apple.com/design/human-interface-guidelines/privacy#Location-button"));
});


test("public Corporate mobile menu keeps Escape, outside dismissal and native editing", () => {
  const src = read("apps/corporate/components/mobile-navigation.tsx");
  assert.match(src, /<details className="mobile-menu"/);
  assert.match(src, /event\.key !== "Escape"/);
  assert.match(src, /document\.addEventListener\("pointerdown", closeOutside\)/);
  assert.match(src, /detailsRef\.current\.contains\(event\.target as Node\)/);
  assert.doesNotMatch(src, /preventDefault\(\)|document\.oncontextmenu/);
});
