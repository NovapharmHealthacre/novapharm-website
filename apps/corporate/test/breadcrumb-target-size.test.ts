import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const component = readFileSync(new URL("../components/ui.tsx", import.meta.url), "utf8");

test("corporate breadcrumb links meet Apple mobile touch-size guidance and WCAG target sizing", () => {
  const linkRule = css.match(/\\.breadcrumbs a\\s*\\{([^}]+)\\}/)?.[1];
  assert.ok(linkRule, "Shared breadcrumb link rule is required");
  assert.match(linkRule, /display:\\s*inline-flex\\s*;/);
  assert.match(linkRule, /align-items:\\s*center\\s*;/);
  assert.match(linkRule, /min-height:\\s*44px\\s*;/);
  assert.match(css, /\\.breadcrumbs span \\{ display: flex; align-items: center; gap: 9px; \\}/);
  assert.match(component, /<nav className="breadcrumbs" aria-label="Breadcrumb">/);
  assert.match(component, /<Link href=\\{item.href\\}>\\{item.label\\}<\\/Link>/);
});
