import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import test from "node:test";
import {
  deriveFounderBridgeKey, founderSessionBridgeHeaders,
  requestFounderPrivateSession,
} from "../src/core/intelligence-founder-private-session-bridge.mjs";

const key = "my-private-production-signing-key-".repeat(3);
const idToken = "i".repeat(220);
const accessToken = "a".repeat(240);
const nowSeconds = 1800000000;

test("private bridge requires a secret and binds both tokens, time and nonce", () => {
  assert.throws(() => deriveFounderBridgeKey("bad"));
  const nonce = "1".repeat(22);
  const h = founderSessionBridgeHeaders({
    idToken, accessToken, signingKey: key, nowSeconds, nonce,
  });
  const message = [String(nowSeconds), nonce,
    createHash("sha256").update(idToken, "ascii").digest("hex"),
    createHash("sha256").update(accessToken, "ascii").digest("hex"),
  ].join(".");
  const expected = createHmac("sha256", deriveFounderBridgeKey(key))
    .update(message).digest("hex");
  assert.equal(h["X-Npi-Founder-Proof"], expected);
  assert.equal(h["X-Npi-Founder-Time"], String(nowSeconds));
  assert.equal(h["X-Npi-Founder-Nonce"], nonce);
  assert.ok(!JSON.stringify(h).includes(idToken));
  assert.ok(!JSON.stringify(h).includes(accessToken));
});

test("off by default; never sends credentials or issues a cookie", async () => {
  let calls = 0;
  const result = await requestFounderPrivateSession({
    idToken, accessToken, signingKey: key,
    enabled: false, fetchImpl: async () => { calls++; throw Error(); },
  });
  assert.equal(result, null);
  assert.equal(calls, 0);
});

test("approved private service sets only an opaque 30-minute founder-shell cookie", async () => {
  const token = "a".repeat(43);
  let called = 0;
  const r = await requestFounderPrivateSession({
    idToken, accessToken, signingKey: key, nowSeconds, enabled: true,
    fetchImpl: async (url, options) => {
      called++;
      assert.equal(url, "https://intelligence.novapharmhealthcare.com/founder/session");
      assert.equal(options.method, "POST");
      assert.equal(options.redirect, "error");
      assert.equal(options.headers.Authorization, "Bearer " + idToken);
      assert.equal(JSON.parse(options.body).accessToken, accessToken);
      return new Response(JSON.stringify({
        ok: true, code: "founder_session_active",
        role: "founder", scope: "founder-shell-read-only",
        customerAccess: false, medicinesDataAccess: false,
      }), {
        status: 200, headers: {
          "Set-Cookie": "__Host-npi_founder=" + token +
            "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=1800",
        },
      });
    },
  });
  assert.equal(called, 1);
  assert.deepEqual(r, { token, maxAge: 1800, scope: "founder-shell-read-only" });
});

test("upstream customer approval or unsafe cookies always refuse founder session", async () => {
  const cookies = [
    "__Host-npi_session=" + "b".repeat(43) + "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=1800",
    "__Host-npi_founder=" + "b".repeat(43) + "; Domain=evil.example; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=1800",
    "__Host-npi_founder=" + "b".repeat(43) + "; Path=/; HttpOnly; SameSite=Lax; Max-Age=1800",
    "__Host-npi_founder=" + "b".repeat(43) + "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600",
  ];
  for (const cookie of cookies) {
    const r = await requestFounderPrivateSession({
      idToken, accessToken, signingKey: key, nowSeconds, enabled: true,
      fetchImpl: async () => new Response(JSON.stringify({
        ok: true, code: "founder_session_active",
        role: "founder", scope: "founder-shell-read-only",
        customerAccess: false, medicinesDataAccess: false,
      }), {status: 200, headers: {"Set-Cookie": cookie}}),
    });
    assert.equal(r, null);
  }
  for (const field of ["customerAccess", "medicinesDataAccess"]) {
    const r = await requestFounderPrivateSession({
      idToken, accessToken, signingKey: key, nowSeconds, enabled: true,
      fetchImpl: async () => new Response(JSON.stringify({
        ok: true, code: "founder_session_active",
        role: "founder", scope: "founder-shell-read-only",
        customerAccess: field === "customerAccess",
        medicinesDataAccess: field === "medicinesDataAccess",
      }), {status: 200, headers: {"Set-Cookie": "__Host-npi_founder=" +
        "b".repeat(43) + "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=1800"}}),
    });
    assert.equal(r, null);
  }
});
