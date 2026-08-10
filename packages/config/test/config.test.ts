import assert from "node:assert/strict";
import test from "node:test";
import { createEstateRuntimeConfig } from "../src/index.ts";

test("PUBLIC_ONLY requires only a public origin", () => {
  const config = createEstateRuntimeConfig({ NODE_ENV: "production", PLATFORM_MODE: "PUBLIC_ONLY", PUBLIC_ORIGIN: "https://novapharmhealthcare.com" });
  assert.equal(config.capabilities.portal, false);
  assert.equal(config.publicOrigin, "https://novapharmhealthcare.com");
});

test("FULL_PLATFORM requires isolated portal and API origins", () => {
  const config = createEstateRuntimeConfig({
    NODE_ENV: "production",
    PLATFORM_MODE: "FULL_PLATFORM",
    PUBLIC_ORIGIN: "https://novapharmhealthcare.com",
    PORTAL_ORIGIN: "https://portal.novapharmhealthcare.com",
    PUBLIC_API_ORIGIN: "https://api.novapharmhealthcare.com"
  });
  assert.equal(config.portalOrigin, "https://portal.novapharmhealthcare.com");
  assert.equal(config.apiOrigin, "https://api.novapharmhealthcare.com");
});

test("wildcards, insecure production origins and shared trust boundaries fail closed", () => {
  assert.throws(() => createEstateRuntimeConfig({ NODE_ENV: "production", PLATFORM_MODE: "PUBLIC_ONLY", PUBLIC_ORIGIN: "http://novapharmhealthcare.com" }), /HTTPS/);
  assert.throws(() => createEstateRuntimeConfig({ NODE_ENV: "production", PLATFORM_MODE: "PUBLIC_ONLY", PUBLIC_ORIGIN: "https://*.novapharmhealthcare.com" }), /wildcard/);
  assert.throws(() => createEstateRuntimeConfig({
    NODE_ENV: "production",
    PLATFORM_MODE: "FULL_PLATFORM",
    PUBLIC_ORIGIN: "https://novapharmhealthcare.com",
    PORTAL_ORIGIN: "https://novapharmhealthcare.com",
    PUBLIC_API_ORIGIN: "https://api.novapharmhealthcare.com"
  }), /distinct/);
});
