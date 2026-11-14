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
const customerUser: PortalUser = {
  ...user,
  username: "linked-customer-001",
  displayName: "Linked Customer",
  role: "client",
  accessType: "customer",
  accessScopes: ["customer"],
  customerAccountLinked: true,
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
  assert.equal(sessionDecision(customerView, customerUser), "allow");
  assert.equal(sessionDecision(customerView, { ...customerUser, customerAccountLinked: false }), "deny");
  assert.equal(sessionDecision(customerView, { ...user, role: "client", accessType: "customer", accessScopes: ["customer"] }), "deny");
  assert.equal(sessionDecision(customerView, { ...customerUser, accessScopes: ["admin"], customerAccountLinked: false }), "deny");
});

test("customer session API must attest a canonical account link before exposing its workspace", async () => {
  let called = 0;
  const lookup = async (customerAccountLinked: unknown) => verifiedPortalSession({
    cookieValue,
    apiOrigin: "https://api.novapharmhealthcare.com",
    production: true,
    fetchImpl: async () => {
      called++;
      return Response.json({ user: { ...customerUser, customerAccountLinked } });
    },
  });
  assert.deepEqual(await lookup(true), customerUser);
  assert.equal(await lookup(false), null);
  assert.equal(await lookup(undefined), null);
  assert.equal(await lookup("true"), null);
  assert.equal(called, 4);
  const backend = readFileSync("../../server.mjs", "utf8");
  assert.match(backend, /customerAccountLinked: session\.accessType === "customer" && Boolean\(enterpriseContext\(session\)\.customerId\)/);
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

test("production-like isolated browser validation may use loopback HTTP but never remote HTTP", async () => {
  let calls = 0;
  const fetchImpl: typeof fetch = async (url) => {
    calls += 1;
    assert.equal(String(url), "http://127.0.0.1:4178/api/portal/session");
    return Response.json({ user });
  };
  assert.deepEqual(await verifiedPortalSession({
    cookieValue,
    apiOrigin: "http://127.0.0.1:4178",
    production: true,
    validationMode: true,
    fetchImpl,
  }), user);
  assert.equal(calls, 1);
  assert.equal(await verifiedPortalSession({
    cookieValue,
    apiOrigin: "http://127.0.0.1:4178",
    production: true,
    validationMode: false,
    fetchImpl,
  }), null);
  assert.equal(await verifiedPortalSession({
    cookieValue,
    apiOrigin: "http://example.com",
    production: true,
    validationMode: true,
    fetchImpl,
  }), null);
  assert.equal(calls, 1);
});
