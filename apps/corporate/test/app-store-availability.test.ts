import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const availability = readFileSync(path.join(root, "components/app-store-availability.tsx"), "utf8");
const footer = readFileSync(path.join(root, "components/site-footer.tsx"), "utf8");

test("corporate store links cannot be shown without explicit native-app publication approval", () => {
  assert.match(availability, /NOVAPHARM_APP_STORE_PUBLISHED !== "true"/);
  assert.match(availability, /NOVAPHARM_APP_STORE_DISPLAY_NAME/);
  assert.match(availability, /NOVAPHARM_IOS_APP_STORE_URL/);
  assert.match(availability, /NOVAPHARM_MAC_APP_STORE_URL/);
  assert.match(availability, /AppleAppStoreBadges/);
  assert.match(footer, /<AppStoreAvailability \/>/);
  assert.doesNotMatch(footer, /apps\.apple\.com|app-store-black\.svg/);
});
