import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const mobileRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(mobileRoot, "../..");
const json = (file) => JSON.parse(readFileSync(file, "utf8"));
const eas = json(path.join(mobileRoot, "eas.json"));
const app = json(path.join(mobileRoot, "app.json")).expo;
const owner = json(path.join(repoRoot, "config/intelligence/owner-production-constraints.json"));

test("pre-store builds are restricted to installable Android APK and unsigned iOS Simulator", () => {
  assert.deepEqual(Object.keys(eas.build).sort(),
    ["android-private-apk", "ios-simulator"]);
  assert.equal(eas.cli.appVersionSource, "local");
  assert.equal(eas.build["android-private-apk"].distribution, "internal");
  assert.equal(eas.build["android-private-apk"].android.buildType, "apk");
  assert.equal(eas.build["ios-simulator"].ios.simulator, true);
  assert.equal(eas.build["ios-simulator"].distribution, undefined);
  assert.equal(eas.build.production, undefined);
  assert.equal(eas.submit, undefined);
  assert.equal(eas.build["android-private-apk"].android.gradleCommand, undefined);
  assert.equal(eas.build["ios-simulator"].ios.enterpriseProvisioning, undefined);
});

test("preview builds have no invented store identities or production authorization", () => {
  assert.equal(app.name, "NovaPharm Intelligence");
  assert.equal(app.ios.bundleIdentifier, undefined);
  assert.equal(app.android.package, undefined);
  assert.equal(owner.productionSignoff, "not_granted");
  assert.equal(owner.initialInfrastructureBudget.monthlyCapGbp, 0);
  assert.equal(owner.productionPermissions.activatePublicCustomerAccess, false);
  assert.equal(owner.productionPermissions.enableCustomerBilling, false);
  assert.equal(owner.productionPermissions.enableCustomerSubscriptions, false);
});
