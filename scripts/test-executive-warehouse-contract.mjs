import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const dispatcher = await readFile(resolve("src/core/enterprise-domain-service.mjs"), "utf8");
const overlays = await readFile(resolve("src/core/enterprise-module-overlays.mjs"), "utf8");

assert.match(dispatcher, /module\.slug === "command-centre"\) return commandCentreView/u);
assert.match(dispatcher, /module\.slug === "ceo-dashboard"\) return ceoDashboardView/u);
assert.match(dispatcher, /snapshot\.module\.slug === "warehouse"\) return rollingWarehouseView/u);

for (const title of [
  "Decision and workflow queue",
  "Quality exceptions",
  "Regulatory actions",
  "Commercial outlook",
  "Operating decisions",
  "Quality posture",
  "Regulatory posture"
]) {
  assert.ok(overlays.includes(title), `Missing authored Executive section: ${title}`);
}

assert.match(overlays, /horizon\.setUTCDate\(horizon\.getUTCDate\(\) \+ 90\)/u, "Warehouse expiry must use a rolling 90-day horizon.");
assert.match(overlays, /metric\("expired", "Expired batches", expired\)/u, "Expired batches must be reported separately.");
assert.doesNotMatch(overlays, /2026-10-31/u, "Canonical module overlay must not embed a fixed warehouse expiry date.");
assert.match(overlays, /not a Finance clone/u, "CEO Dashboard must state its distinct executive purpose.");
assert.match(overlays, /read-only exception and decision surface/u, "Command Centre must preserve read-only authority.");

console.log(JSON.stringify({
  authoredExecutiveModules: ["executive.command-centre", "executive.ceo-dashboard"],
  rollingWarehouseExpiryDays: 90,
  expiredBatchesSeparated: true,
  fixedCalendarCutoffInOverlay: false
}, null, 2));
