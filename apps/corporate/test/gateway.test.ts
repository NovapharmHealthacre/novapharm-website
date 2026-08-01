import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { NextRequest } from "next/server";
import { forwardPlatformRequest } from "../lib/platform-gateway";

const mutableEnvironment = process.env as Record<string, string | undefined>;

async function upstreamServer() {
  let receivedOrigin = "";
  const server = createServer((request, response) => {
    receivedOrigin = String(request.headers.origin ?? "");
    assert.equal(request.method, "GET");
    assert.equal(request.url, "/api/security/csrf");
    response.statusCode = 200;
    response.setHeader("Content-Type", "application/json");
    response.setHeader("Set-Cookie", "np_csrf=synthetic; HttpOnly; Secure; SameSite=Strict; Path=/");
    response.end(JSON.stringify({ csrfToken: "synthetic-token" }));
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  return {
    origin: `http://127.0.0.1:${address.port}`,
    receivedOrigin: () => receivedOrigin,
    close: () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}

test("same-origin gateway relays CSRF response and secure cookie", { concurrency: false }, async () => {
  const upstream = await upstreamServer();
  const previousApi = process.env.PUBLIC_API_ORIGIN;
  const previousPublic = process.env.PUBLIC_ORIGIN;
  const previousNodeEnv = process.env.NODE_ENV;
  mutableEnvironment.PUBLIC_API_ORIGIN = upstream.origin;
  mutableEnvironment.PUBLIC_ORIGIN = "https://novapharmhealthcare.com";
  mutableEnvironment.NODE_ENV = "test";
  try {
    const request = new NextRequest("https://novapharmhealthcare.com/api/platform/security/csrf", { method: "GET" });
    const response = await forwardPlatformRequest(request, { params: Promise.resolve({ path: ["security", "csrf"] }) });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { csrfToken: "synthetic-token" });
    assert.match(response.headers.get("set-cookie") ?? "", /np_csrf=synthetic/);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(upstream.receivedOrigin(), "https://novapharmhealthcare.com");
  } finally {
    if (previousApi === undefined) delete mutableEnvironment.PUBLIC_API_ORIGIN;
    else mutableEnvironment.PUBLIC_API_ORIGIN = previousApi;
    if (previousPublic === undefined) delete mutableEnvironment.PUBLIC_ORIGIN;
    else mutableEnvironment.PUBLIC_ORIGIN = previousPublic;
    if (previousNodeEnv === undefined) delete mutableEnvironment.NODE_ENV;
    else mutableEnvironment.NODE_ENV = previousNodeEnv;
    await upstream.close();
  }
});

test("gateway rejects unlisted routes and oversized payloads before forwarding", { concurrency: false }, async () => {
  const unlisted = await forwardPlatformRequest(
    new NextRequest("https://novapharmhealthcare.com/api/platform/admin/users", { method: "GET" }),
    { params: Promise.resolve({ path: ["admin", "users"] }) },
  );
  assert.equal(unlisted.status, 404);

  const oversized = await forwardPlatformRequest(
    new NextRequest("https://novapharmhealthcare.com/api/platform/contact", {
      method: "POST",
      headers: { "Content-Length": String(129 * 1024), "Content-Type": "application/json" },
      body: "{}",
    }),
    { params: Promise.resolve({ path: ["contact"] }) },
  );
  assert.equal(oversized.status, 413);
  assert.match((await oversized.json()).error, /too large/i);
});

test("gateway returns a controlled outage when runtime origins are invalid", { concurrency: false }, async () => {
  const previousApi = process.env.PUBLIC_API_ORIGIN;
  const previousPublic = process.env.PUBLIC_ORIGIN;
  const previousNodeEnv = process.env.NODE_ENV;
  mutableEnvironment.PUBLIC_API_ORIGIN = "https://api.example.invalid";
  mutableEnvironment.PUBLIC_ORIGIN = "http://public.example.invalid";
  mutableEnvironment.NODE_ENV = "production";
  try {
    const response = await forwardPlatformRequest(
      new NextRequest("https://novapharmhealthcare.com/api/platform/security/csrf", { method: "GET" }),
      { params: Promise.resolve({ path: ["security", "csrf"] }) },
    );
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.match((await response.json()).error, /temporarily unavailable/i);
  } finally {
    if (previousApi === undefined) delete mutableEnvironment.PUBLIC_API_ORIGIN;
    else mutableEnvironment.PUBLIC_API_ORIGIN = previousApi;
    if (previousPublic === undefined) delete mutableEnvironment.PUBLIC_ORIGIN;
    else mutableEnvironment.PUBLIC_ORIGIN = previousPublic;
    if (previousNodeEnv === undefined) delete mutableEnvironment.NODE_ENV;
    else mutableEnvironment.NODE_ENV = previousNodeEnv;
  }
});
