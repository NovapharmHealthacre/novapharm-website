import assert from "node:assert/strict";
import test from "node:test";
import { downloadCsvResourceSample } from "../src/index.ts";

test("bounded source sampling requires range evidence and preserves identifiers as bytes", async () => {
  const body = new TextEncoder().encode('SNOMED_CODE,ITEMS\n"001234567890",1\n');
  const result = await downloadCsvResourceSample("http://127.0.0.1/source.csv", 65_536, {
    fetchImplementation: async (_input, init) => {
      assert.equal(new Headers(init?.headers).get("range"), "bytes=0-65535");
      return new Response(body, { status: 206, headers: { "content-type": "text/csv", "content-range": `bytes 0-${body.length - 1}/100000`, "content-length": String(body.length) } });
    },
  });
  assert.equal(result.byteCount, body.length);
  assert.equal(result.totalResourceBytes, 100_000);
  assert.match(result.sha256, /^[a-f0-9]{64}$/u);
  assert.match(new TextDecoder().decode(result.bytes), /001234567890/u);
});

test("source sampling fails closed when an endpoint ignores the Range request", async () => {
  await assert.rejects(() => downloadCsvResourceSample("http://127.0.0.1/source.csv", 65_536, {
    fetchImplementation: async () => new Response("whole file", { status: 200, headers: { "content-type": "text/csv" } }),
  }), /did not honour/iu);
});
