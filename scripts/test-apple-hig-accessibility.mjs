import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

const read = (path) => readFileSync(resolve(process.cwd(), path), "utf8");
const entry = read("assets/css/novapharm.css");
const source = read("assets/css/novapharm-hig-accessibility.css");
const bundle = read("assets/css/novapharm.bundle.css");
const bundler = read("scripts/build-css-bundle.mjs");
const navigation = read("assets/js/novapharm.js");

assert.ok(entry.includes('@import url("./novapharm-hig-accessibility.css");'), "Site CSS entrypoint missing accessibility guardrails");
assert.ok(bundler.includes('["novapharm-hig-accessibility.css", null]'), "Generated bundle must include accessibility guardrails");
assert.ok(bundle.includes("/* Source: novapharm-hig-accessibility.css */"), "Checked-in production bundle missing accessibility source");
assert.ok(bundle.includes(source.trim()), "The checked-in production bundle must contain the exact reviewed accessibility stylesheet");
for (const pattern of [
  /--np-accessibility-contract:\s*1/,
  /:focus-visible/,
  /min-height:\s*44px/,
  /scroll-margin-block-start/,
  /prefers-reduced-motion:\s*reduce/,
  /prefers-contrast:\s*more/,
  /forced-colors:\s*active/
]) assert.match(source, pattern, `Missing required accessibility contract: ${pattern}`);

for (const pattern of [
  /aria-current/,
  /const normaliseNavigationPath/,
  /setAttribute\("aria-label", isOpen \?/,
  /event\.key === "Escape"/,
  /megaHeader\.addEventListener\("focusin"/
]) assert.match(navigation, pattern, `Missing keyboard/VoiceOver behaviour: ${pattern}`);

execFileSync(process.execPath, ["--check", resolve("assets/js/novapharm.js")], { stdio: "pipe" });
for (const path of ["index.html", "legal/accessibility/index.html"]) {
  const html = read(path);
  assert.match(html, /<html\s[^>]*lang="en-GB"/, `${path}: document language missing`);
  assert.match(html, /class="skip-link"\s+href="#main"/, `${path}: skip to content missing`);
  assert.match(html, /<main\s+id="main"/, `${path}: accessible main landmark missing`);
}
console.log("Apple HIG accessibility web contracts: verified source, bundle, labels, focus, motion and landmarks.");
