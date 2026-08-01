import assert from "node:assert/strict";
import test from "node:test";
import { getStatusSnapshot } from "../lib/status";

test("unconfigured managed targets remain explicit rather than operational", async () => {
  const snapshot = await getStatusSnapshot({ NODE_ENV: "test" }, async () => { throw new Error("fetch should not run"); });
  assert.equal(snapshot.overall, "activation");
  assert.equal(snapshot.services.filter((service) => service.state === "configuration").length, 5);
  assert.equal(snapshot.services.filter((service) => service.state === "operational").length, 1);
  assert.equal(snapshot.services.find((service) => service.code === "corporate")?.visibility, "public");
  assert.equal(snapshot.services.find((service) => service.code === "portal")?.visibility, "private");
});

test("configured services are reduced to a sanitised availability contract", async () => {
  const environment: NodeJS.ProcessEnv = {
    NODE_ENV: "production",
    CORPORATE_ORIGIN: "https://corporate.example.invalid",
    TECHNOLOGY_ORIGIN: "https://technology.example.invalid",
    FOUNDER_ORIGIN: "https://founder.example.invalid",
    PORTAL_ORIGIN: "https://portal.example.invalid",
    PUBLIC_API_ORIGIN: "https://api.example.invalid",
  };
  const response = async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("api.example.invalid")) {
      return new Response(JSON.stringify({ status: "live", service: "novapharm-api", private: "must-not-propagate" }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response("ok", { status: 200, headers: url.includes("portal.example.invalid") ? { "X-Robots-Tag": "noindex, nofollow" } : {} });
  };
  const snapshot = await getStatusSnapshot(environment, response as typeof fetch);
  assert.equal(snapshot.overall, "operational");
  assert.equal(snapshot.services.every((service) => service.state === "operational"), true);
  assert.equal(JSON.stringify(snapshot).includes("must-not-propagate"), false);
});

test("invalid and unavailable targets fail safely", async () => {
  const snapshot = await getStatusSnapshot(
    { NODE_ENV: "production", CORPORATE_ORIGIN: "http://insecure.example.invalid", PUBLIC_API_ORIGIN: "https://api.example.invalid" },
    async () => new Response("unavailable", { status: 503 }),
  );
  assert.equal(snapshot.overall, "disruption");
  assert.equal(snapshot.services.find((service) => service.code === "corporate")?.state, "configuration");
  assert.equal(snapshot.services.find((service) => service.code === "api")?.state, "unavailable");
});
