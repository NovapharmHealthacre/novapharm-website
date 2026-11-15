import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (name) => readFileSync(new URL("../" + name, import.meta.url), "utf8");
const adapted = ["corporate", "portal", "technology", "status"];
const shared = [
  "novapharm-hig-colours.css",
  "symbol-system.css",
  "apple-hig-layout.css",
  "novapharm-hig-motion.css",
  "novapharm-apple-27-web-adaptation.css",
];

for (const app of adapted) {
  test(`${app} imports the complete shared web system`, () => {
    const layout = read(`apps/${app}/app/layout.tsx`);
    for (const stylesheet of shared) {
      assert.ok(layout.includes(`assets/css/${stylesheet}`),
        `${app} is missing the shared design layer ${stylesheet}`);
    }
    assert.ok(layout.includes(`data-np-estate="${app}"`), "Shared CSS must have an estate scope");
    assert.ok(layout.indexOf("novapharm-apple-27-web-adaptation.css") >
      layout.indexOf("apple-hig-layout.css"), "Interactive override must follow layout source");
  });
}

test("Founder retains its intentional dark identity, plus common symbols and motion", () => {
  const layout = read("apps/founder/app/layout.tsx");
  const styles = read("apps/founder/app/base.css");
  assert.ok(layout.includes("assets/css/symbol-system.css"));
  assert.ok(layout.includes("assets/css/novapharm-hig-motion.css"));
  assert.ok(styles.includes("--sans: system-ui"));
  assert.ok(styles.includes("color-scheme: dark"));
  assert.ok(!layout.includes("assets/css/novapharm-hig-colours.css"),
    "Do not force the light semantic palette onto the separately approved dark founder design");
});

test("Status uses visible focus, a readable caption token and 44px actions", () => {
  const css = read("apps/status/app/globals.css");
  const expected = [
    "--np-type-caption-size: 0.875rem",
    ".refresh-command { min-height: 44px;",
    ".service-row > a { justify-self: start; min-height: 44px;",
    ".state-label { font-size: var(--np-type-caption-size, 0.875rem); }",
    ".private-boundary { color: var(--muted); font-size: var(--np-type-caption-size, 0.875rem); }",
    ":focus-visible { outline: 3px solid var(--np-color-focus, #1067a5);",
    "prefers-reduced-motion: reduce",
  ];
  for (const value of expected) assert.ok(css.includes(value), `Missing Status accessibility rule: ${value}`);
});

test("Layout code does not embed proprietary Apple font or native UI packages", () => {
  for (const app of [...adapted, "founder"]) {
    const layout = read(`apps/${app}/app/layout.tsx`);
    for (const unsafe of [".otf", ".ttf", ".woff", "SF-Symbols-27.dmg", "apple-ios-27-ui-kit"]) {
      assert.ok(!layout.includes(unsafe), `${app} imports a platform-only asset: ${unsafe}`);
    }
  }
});
