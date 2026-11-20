import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const layout = readFileSync(path.join(root, "app/layout.tsx"), "utf8");
const css = readFileSync(path.join(root, "app/globals.css"), "utf8");

test("corporate keyboard bypass points to an explicit, focusable main landmark", () => {
  assert.match(layout, /<a className="skip-link" href="#main-content">Skip to main content<\/a>/);
  assert.match(layout, /<main id="main-content" tabIndex=\{-1\}/);
  assert.equal((layout.match(/id="main-content"/g) ?? []).length, 1,
    "The skip link must resolve to exactly one main target");
  assert.match(css, /\.skip-link:focus\s*\{\s*transform:\s*none;/,
    "The keyboard skip control must become visible when focused");
  assert.match(css, /:focus-visible\s*\{\s*outline:/,
    "Visible focus styling must remain enabled");
});
