import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const source = read("assets/css/novapharm-hig-motion.css");
const legacy = read("assets/css/motion.css");
const entry = read("assets/css/novapharm.css");
const builder = read("scripts/build-css-bundle.mjs");
const bundle = read("assets/css/novapharm.bundle.css");
assert.match(source, /--np-motion-contract:\s*1/);
for (const rule of [
  "prefers-reduced-motion: reduce", "prefers-reduced-data: reduce",
  "forced-colors: active", "pointer: fine", "np-dialog-enter",
  "--np-motion-standard", "data-np-motion=\"enter\"",
  "animation-iteration-count: 1 !important", "scroll-behavior: auto !important",
  ".hero-cinematic-grid", ".hero-cinematic-orbit", ".hero-signal-card",
  ".module-hero-media picture img", "body[data-page=\"home\"] .pharma-home-media img"
]) assert.ok(source.includes(rule), `Missing motion invariant: ${rule}`);
assert.ok(!/infinite/.test(legacy), "Perpetual background network animation must remain disabled");
assert.ok(/animation:\s*none/.test(legacy), "Network visualization should be static");
assert.ok(!/translateY\(18px\)/.test(legacy), "Large reveal translation returned");
assert.ok(entry.includes('@import url("./novapharm-hig-motion.css");'), "Pages CSS entrypoint is not wired");
assert.ok(builder.includes('["novapharm-hig-motion.css", null]'), "Public CSS builder must include motion last");
assert.ok(bundle.includes("/* Source: novapharm-hig-motion.css */"), "Published CSS bundle missing motion source");
assert.ok(bundle.includes(source.trim()), "Generated bundle contains stale motion CSS");
assert.ok(bundle.includes(legacy.trim()), "Generated bundle contains stale contextual reveal CSS");
for (const app of ["corporate", "portal", "technology", "status", "founder"]) {
  const layout = read(`apps/${app}/app/layout.tsx`);
  assert.ok(layout.includes('assets/css/novapharm-hig-motion.css'), `${app}: missing shared motion import`);
}
for (const workflow of [
  ".github/workflows/pages-live-publish.yml",
  ".github/workflows/publish-aws-contact-production.yml",
  ".github/workflows/dispatch-approved-aws-contact-release.yml"
]) {
  assert.ok(read(workflow).includes("assets/css/novapharm-hig-motion.css"),
    `${workflow}: changes to the shared motion DNA must trigger a release or validation`);
}
// The Corporate Next.js route does not set the legacy static body[data-page]
// attribute. Test the real class selector, not the legacy Pages-only selector.
const corporateHero = read("apps/corporate/app/apple-pharma.css");
assert.doesNotMatch(corporateHero, /\.pharma-home-media img\s*\{[^}]*\banimation\s*:[^}]*\binfinite\b/s,
  "Corporate homepage photography must not include perpetual animation");
assert.ok(!corporateHero.includes("@keyframes pharmaHeroDrift"),
  "Obsolete Corporate hero keyframes must remain removed");
assert.ok(source.includes(".pharma-home-media img,"),
  "Shared motion stylesheet must stop perpetual Corporate Next.js hero movement");
// Today's portal.novapharmhealthcare.com uses a separate Lambda BFF, NOT the
// unreleased unified Next.js portal. Keep a source-level reduced-motion check,
// without mistaking it for proof that the Lambda was independently deployed.
const transitionalCustomer = read("apps/nutraxin-customer-api/index.py");
assert.ok(transitionalCustomer.includes("@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;animation:none!important;transition:none!important}}"),
  "Customer account entry needs a no-motion fallback");
const script = read("assets/js/novapharm.js");
assert.ok(script.includes('typeof IntersectionObserver !== "undefined"'), "Missing no-IntersectionObserver fallback");
assert.ok(script.includes('motionPreference.addEventListener?.("change"'), "Motion preference changes must be handled");
execFileSync(process.execPath, ["--check", new URL("../assets/js/novapharm.js", import.meta.url).pathname]);
console.log("Apple HIG web motion: shared estates, optional state transitions, reduced motion, no decorative loop — PASS");
