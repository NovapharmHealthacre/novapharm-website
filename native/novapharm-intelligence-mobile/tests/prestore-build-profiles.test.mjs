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

test("pre-store EAS builds are Android APK only; SwiftUI owns the iOS release path", () => {
  assert.deepEqual(Object.keys(eas.build), ["android-private-apk"]);
  assert.equal(eas.cli.appVersionSource, "local");
  assert.equal(eas.build["android-private-apk"].distribution, "internal");
  assert.equal(eas.build["android-private-apk"].android.buildType, "apk");
  assert.equal(eas.build["ios-simulator"], undefined);
  assert.equal(eas.build.ios, undefined);
  assert.equal(eas.build.production, undefined);
  assert.equal(eas.submit, undefined);
  assert.equal(eas.build["android-private-apk"].android.gradleCommand, undefined);
  assert.equal(eas.build["android-private-apk"].ios, undefined);
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
