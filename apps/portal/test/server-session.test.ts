import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolvePortalView } from "../data/routes";
import type { PortalUser } from "../lib/gateway";
import { sessionDecision, verifiedPortalSession } from "../lib/server-session";

const cookieValue = "session-identifier-12345." + "a".repeat(64);
const user: PortalUser = {
  username: "authorised-test-user",
  displayName: "Test User",
  role: "board",
  accessType: "board",
  accessScopes: ["board"],
  mustChangePassword: false,
};
const boardView = resolvePortalView("/portal/executive-platform/medicines-intelligence/medicine-search/");
const customerView = resolvePortalView("/portal/dashboard/");
if (!boardView || boardView.kind !== "module" || !customerView || customerView.kind !== "module") {
  throw new Error("Protected route fixtures are missing.");
}

test("server-owned protected workspace never renders on cookie presence alone", () => {
  const page = readFileSync("app/[[...slug]]/page.tsx", "utf8");
  assert.match(page, /verifiedPortalSession/);
  assert.match(page, /sessionDecision/);
  assert.match(page, /if \(decision !== "allow"\) redirect\("\/"\)/);
});

test("server session decision enforces module area and password-replacement boundary", () => {
  assert.equal(sessionDecision(boardView, null), "deny");
  assert.equal(sessionDecision(boardView, { ...user, accessScopes: ["customer"] }), "deny");
  assert.equal(sessionDecision(boardView, user), "allow");
  assert.equal(sessionDecision(boardView, { ...user, accessScopes: ["admin"] }), "allow");
  assert.equal(sessionDecision(boardView, { ...user, mustChangePassword: true }), "change-password");
  assert.equal(sessionDecision(customerView, user), "deny");
});

test("valid session lookup queries a fixed HTTPS backend without forwarding other cookies", async () => {
  let called = 0;
  const result = await verifiedPortalSession({
    cookieValue,
    apiOrigin: "https://api.novapharmhealthcare.com",
    production: true,
    fetchImpl: async (url, init) => {
      called += 1;
      assert.equal(String(url), "https://api.novapharmhealthcare.com/api/portal/session");
      assert.equal(init?.method, "GET");
      assert.equal(init?.cache, "no-store");
      assert.equal(init?.redirect, "manual");
      assert.deepEqual(init?.headers, { Cookie: "np_session=" + encodeURIComponent(cookieValue) });
      return Response.json({ user });
    },
  });
  assert.equal(called, 1);
  assert.deepEqual(result, user);
});

test("missing, malformed and arbitrary API destinations fail without a network request", async () => {
  let calls = 0;
  const fetchImpl: typeof fetch = async () => { calls += 1; return Response.json({ user }); };
  for (const [token, origin] of [
    ["", "https://api.novapharmhealthcare.com"],
    ["forged", "https://api.novapharmhealthcare.com"],
    [cookieValue, "http://api.novapharmhealthcare.com"],
    [cookieValue, "https://evil.example/path"],
    [cookieValue, "https://user:password@evil.example"],
    [cookieValue, "not a url"],
  ] as const) {
    assert.equal(await verifiedPortalSession({ cookieValue: token, apiOrigin: origin, production: true, fetchImpl }), null);
  }
  assert.equal(calls, 0);
});

test("rejected, redirected, malformed and unavailable sessions are never authorised", async () => {
  const responses: Array<Response | Error> = [
    Response.json({ error: "unauthorised" }, { status: 401 }),
    new Response(null, { status: 302, headers: { location: "https://evil.example" } }),
    Response.json({ user: { accessScopes: ["board"] } }),
    Response.json({ user: { ...user, accessScopes: "board" } }),
    new Error("api unavailable"),
  ];
  for (const item of responses) {
    const result = await verifiedPortalSession({
      cookieValue,
      apiOrigin: "https://api.novapharmhealthcare.com",
      production: true,
      fetchImpl: async () => { if (item instanceof Error) throw item; return item; },
    });
    assert.equal(result, null);
  }
});
