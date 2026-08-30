import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { CkanClient } from "../src/index.ts";

test("bulk resource download resumes a governed partial file and verifies the completed checksum", async () => {
  const destination = join(tmpdir(), `novapharm-download-${process.pid}-${Date.now()}.csv`);
  await writeFile(`${destination}.part`, "abc", { mode: 0o600 });
  let observedRange = "";
  const fakeFetch: typeof fetch = async (_input, init) => {
    observedRange = new Headers(init?.headers).get("range") ?? "";
    assert.ok(init?.signal, "Bulk downloads must retain a bounded abort signal.");
    return new Response("def", { status: 206, headers: { "content-type": "text/csv", "content-length": "3" } });
  };
  const expected = createHash("sha256").update("abcdef").digest("hex");
  const client = new CkanClient({ baseUrl: "https://example.test/api/3/action", fetchImplementation: fakeFetch, maxRetries: 0 });
  try {
    const result = await client.downloadResource({
      id: "resource", name: "EPD_202606", title: "EPD", url: "https://example.test/epd.csv",
      format: "CSV", size: 6, sha256: expected,
    }, { destination, maxBytes: 10, timeoutMs: 120_000 });
    assert.equal(observedRange, "bytes=3-");
    assert.equal(result.resumed, true);
    assert.equal(result.bytes, 6);
    assert.equal(result.sha256, expected);
    assert.equal(result.expectedHashMatched, true);
    assert.equal(await readFile(destination, "utf8"), "abcdef");
  } finally {
    await rm(destination, { force: true });
    await rm(`${destination}.part`, { force: true });
    await rm(`${destination}.checkpoint.json`, { force: true });
  }
});

test("bulk resource download rejects an ungoverned short timeout", async () => {
  const client = new CkanClient({ baseUrl: "https://example.test/api/3/action", fetchImplementation: async () => new Response("x") });
  await assert.rejects(() => client.downloadResource({ id: "resource", name: "x", title: "x", url: "https://example.test/x.csv", format: "CSV", size: 1 }, {
    destination: join(tmpdir(), "not-created.csv"), maxBytes: 2, timeoutMs: 1_000,
  }), /between two minutes and 24 hours/iu);
});
