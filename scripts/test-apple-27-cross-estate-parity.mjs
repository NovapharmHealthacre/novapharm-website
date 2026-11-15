import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (name) => readFileSync(new URL("../" + name, import.meta.url), "utf8");
const adapted = [
  "corporate",
  "portal",
  "technology",
  "status",
];
const common = [
  "novapharm-hig-colours.css",
  "symbol-system.css",
  "apple-hig-layout.css",
  "novapharm-hig-motion.css",
  "novapharm-apple-27-web-adaptation.css",
];

for (const app of adapted) {
  test(`${app} loads all five shared web-adaptation layers`, () => {
    const layout = read(`apps/${app}/app/layout.tsx`);
    for (const stylesheet of common) {
      assert.ok(layout.includes(`assets/css/${stylesheet}`),
        `${app} missing ${stylesheet}; do not silently fork the system`);
    }
    assert.ok(layout.includes(`data-np-estate="${app}"`),
      `${app} must scope shared CSS to its own estate`);
    assert.ok(layout.indexOf("novapharm-apple-27-web-adaptation.css") >
      layout.indexOf("apple-hig-layout.css"),
      `${app} must load the platform interaction adaptation last`);
  });
}

test("Founder deliberately keeps independent dark editorial branding but uses shared lawful symbols and motion", () => {
  const layout = read("apps/founder/app/layout.tsx");
  const styles = read("apps/founder/app/base.css");
  assert.match(layout, /assets\\/css\\/symbol-system\\.css/);
  assert.match(layout, /assets\\/css\\/novapharm-hig-motion\\.css/);
  assert.match(styles, /--sans:\\s*system-ui/);
  assert.match(styles, /color-scheme:\\s*dark/);
  assert.doesNotMatch(layout, /novapharm-hig-colours\\.css/,
    "Do not apply the light-only palette over Founder dark surfaces without visual acceptance");
});

test("Status uses the canonical accessible colour and minimum interaction size", () => {
  const css = read("apps/status/app/globals.css");
  assert.match(css, /--np-type-caption-size:\\s*0\\.875rem/);
  assert.match(css, /\\.refresh-command\\s*\\{\\s*min-height:\\s*44px/);
  assert.match(css, /\\.service-row\\s*>\\s*a\\s*\\{[^}]*min-height:\\s*44px/s);
  assert.match(css, /\\.state-label\\s*\\{\\s*font-size:\\s*var\\(--np-type-caption-size/);
  assert.match(css, /\\.private-boundary\\s*\\{[^}]*font-size:\\s*var\\(--np-type-caption-size/s);
  assert.match(css, /:focus-visible\\s*\\{[^}]*--np-color-focus/s);
  assert.match(css, /prefers-reduced-motion:\\s*reduce/);
});

test("No proprietary Apple font package or native UI asset is imported by these roots", () => {
  for (const app of [...adapted, "founder"]) {
    const layout = read(`apps/${app}/app/layout.tsx`);
    assert.doesNotMatch(layout, /\\.(?:otf|ttf|woff2?)["']/i);
    assert.doesNotMatch(layout, /SF-Symbols-27\\.dmg|apple-ios-27-ui-kit/i);
  }
});
