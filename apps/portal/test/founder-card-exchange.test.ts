import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { POST } from "../app/auth/founder/exchange/route";

const origin = "https://intelligence.novapharmhealthcare.com";
const idToken = ["a".repeat(120), "b".repeat(120), "c".repeat(120)].join(".");
const accessToken = ["d".repeat(120), "e".repeat(120), "f".repeat(120)].join(".");
const secret = "v".repeat(64);

function request(options: {
  origin?: string; bearer?: string; body?: string; contentType?: string;
} = {}): NextRequest {
  return new NextRequest(origin + "/auth/founder/exchange", {
    method: "POST",
    headers: {
      Origin: options.origin ?? origin,
      Authorization: options.bearer ?? "Bearer " + idToken,
      "Content-Type": options.contentType ?? "application/json",
    },
    body: options.body ?? JSON.stringify({ accessToken }),
  });
}

test("founder card exchange rejects other origins and invalid bearer tokens without issuance", async () => {
  assert.equal((await POST(request({ origin: "https://other.example" }))).status, 403);
  assert.equal((await POST(request({ bearer: "Bearer bad" }))).status, 401);
  assert.equal((await POST(request({ contentType: "text/plain" }))).status, 415);
  assert.equal((await POST(request({ body: JSON.stringify({ accessToken: "bad" }) }))).status, 401);
});

test("founder exchange remains denied when release flag is off", async () => {
  const wasEnabled = process.env["NPI_FOUNDER_SESSION_API_ENABLED"];
  const wasSecret = process.env["NPI_FOUNDER_BRIDGE_KEY"];
  process.env["NPI_FOUNDER_SESSION_API_ENABLED"] = "false";
  process.env["NPI_FOUNDER_BRIDGE_KEY"] = secret;
  try {
    const response = await POST(request());
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("set-cookie"), null);
  } finally {
    if (wasEnabled === undefined) delete process.env["NPI_FOUNDER_SESSION_API_ENABLED"];
    else process.env["NPI_FOUNDER_SESSION_API_ENABLED"] = wasEnabled;
    if (wasSecret === undefined) delete process.env["NPI_FOUNDER_BRIDGE_KEY"];
    else process.env["NPI_FOUNDER_BRIDGE_KEY"] = wasSecret;
  }
});

test("verified isolated founder backend produces only a secure, short opaque founder cookie", async () => {
  const previousFetch = globalThis.fetch;
  const enabled = process.env["NPI_FOUNDER_SESSION_API_ENABLED"];
  const previousKey = process.env["NPI_FOUNDER_BRIDGE_KEY"];
  const opaque = "X".repeat(43);
  process.env["NPI_FOUNDER_SESSION_API_ENABLED"] = "true";
  process.env["NPI_FOUNDER_BRIDGE_KEY"] = secret;
  let forwarded = false;
  globalThis.fetch = async (url, init) => {
    forwarded = true;
    assert.equal(String(url), origin + "/founder/session");
    assert.equal(init?.method, "POST");
    assert.ok(init?.headers && typeof init.headers === "object");
    assert.equal((init.headers as Record<string, string>)["Authorization"], `Bearer ${idToken}`);
    assert.equal(JSON.parse(String(init?.body)).accessToken, accessToken);
    return new Response(JSON.stringify({
      ok: true, code: "founder_session_active", role: "founder",
      scope: "founder-shell-read-only", customerAccess: false, medicinesDataAccess: false,
    }), {
      status: 200,
      headers: {
        "Set-Cookie": "__Host-npi_founder=" + opaque +
          "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=1800",
      },
    });
  };
  try {
    const response = await POST(request());
    assert.equal(response.status, 200);
    assert.equal(forwarded, true);
    const cookie = response.headers.get("set-cookie") ?? "";
    assert.match(cookie, /__Host-npi_founder=/);
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /Secure/i);
    assert.doesNotMatch(cookie, /npi_session=/);
    assert.doesNotMatch(await response.text(), new RegExp(accessToken));
  } finally {
    globalThis.fetch = previousFetch;
    if (enabled === undefined) delete process.env["NPI_FOUNDER_SESSION_API_ENABLED"];
    else process.env["NPI_FOUNDER_SESSION_API_ENABLED"] = enabled;
    if (previousKey === undefined) delete process.env["NPI_FOUNDER_BRIDGE_KEY"];
    else process.env["NPI_FOUNDER_BRIDGE_KEY"] = previousKey;
  }
});
