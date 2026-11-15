import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Web-safe SF Symbols *principles*, never proprietary glyph assets.
const read = (path) => readFileSync(resolve(process.cwd(), path), "utf8");
const source = read("assets/css/symbol-system.css");
const colours = read("assets/css/novapharm-hig-colours.css");
const bundle = read("assets/css/novapharm.bundle.css");

for (const [token, semantic] of [
  ["positive", "success"],
  ["warning", "warning"],
  ["critical", "destructive"],
  ["focus", "focus"],
]) {
  assert.match(colours, new RegExp("--np-color-" + semantic + ":\\s*#[0-9a-fA-F]{6}"));
  assert.ok(source.includes("--np-symbol-" + token + ": var(--np-color-" + semantic + ","), "Missing semantic symbol mapping: " + token);
}
assert.match(source, /data-tone="accent"\] \{ color: var\(--np-color-accent-strong,/);
assert.match(source, /\.np-icon-control\s*\{[^}]*min-inline-size:\s*44px;[^}]*min-block-size:\s*44px;/s);
assert.match(source, /\.np-icon-control:focus-visible\s*\{/);
assert.match(source, /prefers-reduced-motion:\s*reduce/);
assert.match(source, /forced-colors:\s*active/);
assert.doesNotMatch(source, /@font-face|\.dmg\b|\.otf\b|\.ttf\b/);

const sourceMarker = "/* Source: symbol-system.css */\n";
const start = bundle.indexOf(sourceMarker);
assert.ok(start >= 0, "Static Pages bundle is missing the symbol system");
assert.equal(bundle.indexOf(sourceMarker, start + sourceMarker.length), -1, "Symbol system must be bundled only once");
const sectionStart = start + sourceMarker.length;
const nextMarker = bundle.indexOf("\n\n/* Source: ", sectionStart);
assert.equal(bundle.slice(sectionStart, nextMarker >= 0 ? nextMarker : undefined).trim(), source.trim(), "Bundled symbols differ from their source");
const staticImports = read("assets/css/novapharm.css");
assert.ok(staticImports.includes('@import url("./symbol-system.css");'), "Static stylesheet source is missing symbols");
assert.ok(read("scripts/build-css-bundle.mjs").includes('["symbol-system.css", null]'), "Symbol stylesheet is missing from the generated CSS builder");

for (const app of ["corporate", "portal", "technology", "founder", "status"]) {
  const layout = read("apps/" + app + "/app/layout.tsx");
  assert.ok(layout.includes('import "../../../assets/css/symbol-system.css";'), app + " must load the shared symbol layer");
}
const primitive = read("packages/design-system/src/symbols.tsx");
const barrel = read("packages/design-system/src/index.ts");
assert.match(primitive, /aria-hidden=\{label \? undefined : true\}/);
assert.match(primitive, /aria-label=\{label\}/);
assert.match(primitive, /role=\{label \? "img" : undefined\}/);
assert.match(primitive, /focusable="false"/);
assert.doesNotMatch(primitive, /from ["\x27]@fortawesome|@font-face|SF-Symbols-27\.dmg/);
assert.ok(barrel.includes('export * from "./symbols.tsx";'));
console.log("NovaPharm web symbol contract passed: semantics, accessibility, licensing, all five apps, generated CSS.");
