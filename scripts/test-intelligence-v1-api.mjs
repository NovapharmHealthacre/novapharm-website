import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { Readable, Writable } from "node:stream";
import { rmSync } from "node:fs";

const databasePath = `/tmp/novapharm-intelligence-v1-${process.pid}-${Date.now()}.sqlite`;
process.env.NODE_ENV = "test";
process.env.DATABASE_PROVIDER = "sqlite";
process.env.DATABASE_PATH = databasePath;
process.env.SESSION_SECRET = randomBytes(36).toString("base64url");
delete process.env.PORTAL_USERS_JSON;

const { handleRequest } = await import("../server.mjs");

class Request extends Readable {
  constructor(path) {
    super();
    this.method = "GET";
    this.url = path;
    this.headers = { host: "novapharm.test" };
    this.socket = { remoteAddress: "127.0.0.1" };
    this.push(null);
  }
}
class Response extends Writable {
  constructor() {
    super();
    this.statusCode = 200;
    this.headers = {};
    this.parts = [];
  }
  writeHead(status, headers = {}) {
    this.statusCode = status;
    this.headers = headers;
    this.headersSent = true;
    return this;
  }
  _write(chunk, encoding, done) {
    this.parts.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
    done();
  }
  get payload() {
    return JSON.parse(Buffer.concat(this.parts).toString("utf8") || "{}");
  }
}
async function invoke(path) {
  const response = new Response();
  const finished = new Promise((resolve, reject) => {
    response.once("finish", resolve);
    response.once("error", reject);
  });
  await handleRequest(new Request(path), response);
  if (!response.writableFinished) await finished;
  return response;
}

try {
  for (const route of [
    "/api/v1/intelligence/medicines/search?q=apixaban",
    "/api/v1/intelligence/medicines/medicine-0123456789abcdef0123456789abcdef",
    "/api/v1/intelligence/markets/observations?dataset=epd",
    "/api/v1/intelligence/geographies/nearby?postcode=SW1A%202AA",
    "/api/v1/intelligence/readiness"
  ]) {
    const response = await invoke(route);
    assert.equal(response.statusCode, 401, route + " must reject anonymous requests");
    assert.equal(response.payload.error, "Authentication required.", route + " must use the existing portal security boundary");
    assert.equal(response.headers["Cache-Control"], "no-store", route + " must not be cached");
  }
  console.log("Intelligence v1 aliases enforce the existing authenticated, board-scoped gateway.");
} finally {
  rmSync(databasePath, { force: true });
}
