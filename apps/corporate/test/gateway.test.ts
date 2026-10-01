import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { NextRequest } from "next/server";
import { forwardPlatformRequest } from "../lib/platform-gateway";

const mutableEnvironment = process.env as Record<string, string | undefined>;

test("form gateway bounds streamed bodies and controls interrupted upstream replies", { concurrency: false }, async (t) => {
  const keys = ["PUBLIC_API_ORIGIN", "PUBLIC_ORIGIN", "NODE_ENV"] as const;
  const previous = keys.map((key) => process.env[key]);
  mutableEnvironment.PUBLIC_API_ORIGIN = "https://api.example.test";
  mutableEnvironment.PUBLIC_ORIGIN = "https://novapharmhealthcare.com";
  mutableEnvironment.NODE_ENV = "production";
  let forwarded = 0;
  let responseMode = "empty";
  t.mock.method(globalThis, "fetch", async () => {
    forwarded += 1;
    if (responseMode === "interrupted") return new Response(new ReadableStream({ start(controller) { controller.error(new Error("Interrupted reply")); } }));
    return new Response(null, { status: 204 });
  });
  const context = { params: Promise.resolve({ path: ["contact"] }) };
  const url = "https://novapharmhealthcare.com/api/platform/contact";
  try {
    const oversized = await forwardPlatformRequest(new NextRequest(url, { method: "POST", headers: { "content-length": "1" }, body: "x".repeat(129 * 1024) }), context);
    assert.equal(oversized.status, 413);
    assert.equal(forwarded, 0);
    const broken = await forwardPlatformRequest(new NextRequest(url, {
      method: "POST", duplex: "half", body: new ReadableStream({ start(controller) { controller.error(new Error("Interrupted upload")); } }),
    } as ConstructorParameters<typeof NextRequest>[1]), context);
    assert.equal(broken.status, 400);
    assert.equal(forwarded, 0);
    const empty = await forwardPlatformRequest(new NextRequest(url, { method: "POST", body: "{}" }), context);
    assert.equal(empty.status, 204);
    assert.equal(await empty.text(), "");
    responseMode = "interrupted";
    const interrupted = await forwardPlatformRequest(new NextRequest(url, { method: "POST", body: "{}" }), context);
    assert.equal(interrupted.status, 503);
    assert.match((await interrupted.json()).error, /could not be confirmed/);
    assert.equal(interrupted.headers.get("cache-control"), "no-store");
  } finally {
    keys.forEach((key, index) => {
      if (previous[index] === undefined) delete mutableEnvironment[key];
      else mutableEnvironment[key] = previous[index];
    });
  }
});

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

test("gateway cannot claim non-submission when an upstream receives the write but drops its response", { concurrency: false }, async () => {
  let receivedWrites = 0;
  const server = createServer((request) => {
    request.resume();
    request.on("end", () => {
      receivedWrites += 1;
      request.socket.destroy();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const keys = ["PUBLIC_API_ORIGIN", "PUBLIC_ORIGIN", "NODE_ENV"] as const;
  const previous = keys.map((key) => process.env[key]);
  mutableEnvironment.PUBLIC_API_ORIGIN = `http://127.0.0.1:${address.port}`;
  mutableEnvironment.PUBLIC_ORIGIN = "https://novapharmhealthcare.com";
  mutableEnvironment.NODE_ENV = "test";
  try {
    const response = await forwardPlatformRequest(new NextRequest("https://novapharmhealthcare.com/api/platform/contact", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
    }), { params: Promise.resolve({ path: ["contact"] }) });
    assert.equal(receivedWrites, 1);
    assert.equal(response.status, 503);
    const payload = await response.json();
    assert.match(payload.error, /could not be confirmed/);
    assert.doesNotMatch(payload.error, /No information was submitted/);
  } finally {
    keys.forEach((key, index) => {
      if (previous[index] === undefined) delete mutableEnvironment[key];
      else mutableEnvironment[key] = previous[index];
    });
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
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
