import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  categoryAllowed,
  CONSENT_MAX_AGE_MS,
  CONSENT_STORAGE_KEY,
  CONSENT_VERSION,
  DEFAULT_CATEGORIES,
  parseConsent,
  readConsent,
  saveConsent
} from "../assets/js/cookie-consent.js";

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.get(key) || null; }
  setItem(key, value) { this.values.set(key, value); }
}

const storage = new MemoryStorage();
assert.equal(readConsent(storage), null);
for (const category of ["preferences", "analytics", "marketing"]) assert.equal(categoryAllowed(null, category), false);
assert.equal(categoryAllowed(null, "necessary"), true);

const now = new Date("2026-07-11T12:00:00.000Z");
const rejected = saveConsent(storage, DEFAULT_CATEGORIES, { now, id: "11111111-2222-4333-8444-555555555555" });
assert.equal(rejected.version, CONSENT_VERSION);
assert.equal(rejected.categories.necessary, true);
for (const category of ["preferences", "analytics", "marketing"]) assert.equal(categoryAllowed(rejected, category), false);

const accepted = saveConsent(storage, { preferences: true, analytics: true, marketing: true }, { now, id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee" });
for (const category of ["necessary", "preferences", "analytics", "marketing"]) assert.equal(categoryAllowed(accepted, category), true);
assert.equal(readConsent(storage, now.getTime()).id, accepted.id);

const expired = JSON.stringify({ ...accepted, timestamp: new Date(now.getTime() - CONSENT_MAX_AGE_MS - 1).toISOString() });
assert.equal(parseConsent(expired, now.getTime()), null);
assert.equal(parseConsent(JSON.stringify({ ...accepted, version: "retired" }), now.getTime()), null);
assert.equal(parseConsent("not-json", now.getTime()), null);
assert.ok(storage.getItem(CONSENT_STORAGE_KEY));

const root = resolve(process.cwd());
const clientSource = readFileSync(resolve(root, "assets/js/novapharm.js"), "utf8");
const serverSource = readFileSync(resolve(root, "server.mjs"), "utf8");
assert.doesNotMatch(clientSource, /\bgtag\s*\(/);
assert.doesNotMatch(serverSource, /googletagmanager|google-analytics/);
assert.match(readFileSync(resolve(root, "index.html"), "utf8"), /cookie-consent\.js/);
assert.match(readFileSync(resolve(root, "legal/cookies/index.html"), "utf8"), /data-cookie-settings/);

console.log("Cookie consent tests passed: optional categories default off, rejection persists, granular acceptance persists, expired records fail closed, and no analytics loader is enabled.");
