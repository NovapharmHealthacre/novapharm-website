import assert from "node:assert/strict";
import test from "node:test";
import { capabilitiesFor, platformModes, resolvePlatformMode } from "../src/index.ts";

test("PUBLIC_ONLY fails closed for server-dependent capabilities", () => {
  const capabilities = capabilitiesFor(platformModes.PUBLIC_ONLY);
  assert.equal(capabilities.publicContent, true);
  assert.equal(capabilities.publicForms, false);
  assert.equal(capabilities.accountApplication, false);
  assert.equal(capabilities.portal, false);
  assert.equal(capabilities.secureApi, false);
});

test("FULL_PLATFORM enables capabilities explicitly", () => {
  assert.equal(capabilitiesFor(platformModes.FULL_PLATFORM).portal, true);
  assert.equal(resolvePlatformMode("full_platform"), platformModes.FULL_PLATFORM);
});

test("unknown modes are rejected", () => {
  assert.throws(() => resolvePlatformMode("preview-ish"), /Unsupported PLATFORM_MODE/);
});
