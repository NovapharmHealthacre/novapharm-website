import assert from "node:assert/strict";
import test from "node:test";
import { createApiRuntimeConfig } from "../src/runtime-config";

test("development config isolates the three application origins", () => {
  const config = createApiRuntimeConfig({
    PUBLIC_ORIGIN: "http://127.0.0.1:4300",
    PUBLIC_API_ORIGIN: "http://127.0.0.1:4173",
    PORTAL_ORIGIN: "http://127.0.0.1:4303",
  });
  assert.deepEqual(config.allowedOrigins, ["http://127.0.0.1:4300", "http://127.0.0.1:4303"]);
  assert.equal(config.apiOrigin, "http://127.0.0.1:4173");
});

test("production requires HTTPS, isolated origins and the managed host binding", () => {
  const valid = createApiRuntimeConfig({
    NODE_ENV: "production",
    HOST: "0.0.0.0",
    PUBLIC_ORIGIN: "https://novapharmhealthcare.com",
    PUBLIC_API_ORIGIN: "https://api.novapharmhealthcare.com",
    PORTAL_ORIGIN: "https://portal.novapharmhealthcare.com",
  });
  assert.equal(valid.environment, "production");

  assert.throws(() => createApiRuntimeConfig({
    NODE_ENV: "production",
    HOST: "0.0.0.0",
    PUBLIC_ORIGIN: "https://novapharmhealthcare.com",
    PUBLIC_API_ORIGIN: "https://novapharmhealthcare.com",
    PORTAL_ORIGIN: "https://portal.novapharmhealthcare.com",
  }), /must be isolated/);
});

test("plaintext passwords and wildcard origins fail closed", () => {
  assert.throws(() => createApiRuntimeConfig({ PORTAL_PASSWORD: "never-allowed" }), /PORTAL_PASSWORD is prohibited/);
  assert.throws(() => createApiRuntimeConfig({ ALLOWED_ORIGINS: "https://*.example.com" }), /Invalid URL|Wildcard origins/);
});
