import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/* Design contract: the website may reference OS-provided fonts, never distribute
   the uploaded SF Pro / SF Compact / SF Mono / New York DMG font binaries. */
const read = (path) => readFileSync(resolve(process.cwd(), path), "utf8");
const sources = [
  "assets/css/tokens.css",
  "assets/css/corporate-product-discipline.css",
  "apps/corporate/app/design-system.css",
  "apps/portal/app/apple-pharma-portal.css",
  "apps/portal/app/employee-distribution.css",
  "apps/technology/styles/base-1.css",
  "apps/status/app/globals.css",
];
for (const path of sources) {
  const css = read(path);
  assert.ok(css.length > 0, path + " must exist");
  assert.doesNotMatch(css, /@font-face\s*\{[^}]*font-family\s*:\s*['"]?(?:SF Pro|SF Compact|SF Mono|New York)/is, path + " must not embed Apple fonts");
  assert.doesNotMatch(css, /url\([^)]*\.(?:dmg|otf|ttf)(?:[?#][^)]*)?\)/i, path + " must not publish a downloaded font binary");
}
for (const path of [
  "assets/css/tokens.css",
  "apps/corporate/app/design-system.css",
  "apps/portal/app/apple-pharma-portal.css",
  "apps/status/app/globals.css",
]) {
  const css = read(path);
  for (const token of ["--np-type-ui", "--np-type-compact", "--np-type-mono", "--np-type-editorial"]) {
    assert.ok(css.includes(token + ":"), path + " missing " + token);
  }
}
assert.match(read("apps/technology/styles/base-1.css"), /--sans:\s*-apple-system/);
assert.match(read("apps/technology/styles/base-1.css"), /--serif:\s*"New York"/);
assert.match(read("apps/portal/app/employee-distribution.css"), /font-variant-numeric:\s*tabular-nums/);
assert.match(read("assets/css/corporate-product-discipline.css"), /font-variant-numeric:\s*tabular-nums/);
console.log("NovaPharm native typography contract passed across public, corporate, portal, WMS, technology and status styles.");
