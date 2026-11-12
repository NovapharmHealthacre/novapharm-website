import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { proxy } from "../proxy";

const base = "https://intelligence.novapharmhealthcare.com";

test("founder shell reaches its server-side session verifier without legacy np_session", () => {
  const response = proxy(new NextRequest(base + "/founder/"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("location"), null);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("server-authorised founder signout is not redirected by the legacy portal guard", () => {
  const response = proxy(new NextRequest(base + "/founder/logout/", {
    method: "POST",
    headers: { origin: base },
  }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("location"), null);
});

test("founder-only cookie does not grant the legacy board or medicines route", () => {
  for (const path of [
    "/portal/executive-platform/",
    "/portal/executive-platform/medicines-intelligence/medicine-search/",
    "/employee/dashboard/",
  ]) {
    const anonymous = proxy(new NextRequest(base + path));
    const founderCookie = proxy(new NextRequest(base + path, {
      headers: { cookie: "__Host-npi_founder=" + "a".repeat(43) },
    }));
    assert.equal(anonymous.status, 307);
    assert.equal(founderCookie.status, 307);
    assert.equal(new URL(founderCookie.headers.get("location") ?? "").pathname, "/");
  }
});

test("founder route continues to require a revocable remote session, never cookie presence alone", async () => {
  const fs = await import("node:fs/promises");
  const page = await fs.readFile("app/founder/page.tsx", "utf8");
  assert.match(page, /if \(!\(await privateFounderSession\(\)\)\) redirect\("\/auth\/customer\/start"\)/u);
  assert.match(page, /response\.status !== 200/u);
  assert.match(page, /result\["scope"\] === "founder-shell-read-only"/u);
  assert.match(page, /result\["customerAccess"\] === false/u);
  assert.match(page, /result\["medicinesDataAccess"\] === false/u);
});

test("Cognito card founder exchange reaches its API Gateway JWT + origin verifier without legacy board cookie", () => {
  const request = new NextRequest(base + "/auth/founder/exchange", {
    method: "POST",
    headers: { origin: base, authorization: "Bearer invalid-test-token" },
  });
  const response = proxy(request);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("location"), null);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("only exact founder exchange route is allowlisted; adjacent unauthorised paths redirect", () => {
  for (const path of ["/auth/founder/exchange-extra", "/auth/founder/session", "/auth/founder/admin"]) {
    const response = proxy(new NextRequest(base + path));
    assert.equal(response.status, 307);
    assert.equal(new URL(response.headers.get("location") ?? "").pathname, "/");
  }
});
