import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { resolvePreviewMedia, sha256OfFile } from "./apple-preview-media-integrity.mjs";

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "novapharm-preview-integrity-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, "assets", "approved"), { recursive: true });
  const media = join(root, "assets", "approved", "preview.mp4");
  const bytes = Buffer.from("synthetic video checksum fixture - not marketing footage", "utf8");
  writeFileSync(media, bytes);
  const outside = join(root, "outside.mp4");
  writeFileSync(outside, bytes);
  symlinkSync(outside, join(root, "assets", "escape.mp4"));
  return { root, media, bytes };
}

test("approved preview media must resolve to a regular file within real assets", (t) => {
  const { root, media } = fixture(t);
  assert.equal(resolvePreviewMedia(root, "/assets/approved/preview.mp4"), realpathSync(media));
  assert.equal(resolvePreviewMedia(root, "/assets/"), null);
  assert.equal(resolvePreviewMedia(root, "/assets/approved"), null);
  assert.equal(resolvePreviewMedia(root, "/assets/missing.mp4"), null);
  assert.equal(resolvePreviewMedia(root, "/assets/../outside.mp4"), null);
  assert.equal(resolvePreviewMedia(root, "/assets/escape.mp4"), null);
  assert.equal(resolvePreviewMedia(root, "https://example.com/preview.mp4"), null);
});

test("preview checksum is the SHA-256 of actual file bytes, not just metadata", (t) => {
  const { media, bytes } = fixture(t);
  const expected = createHash("sha256").update(bytes).digest("hex");
  assert.match(expected, /^[a-f0-9]{64}$/u);
  assert.equal(sha256OfFile(media), expected);
  writeFileSync(media, Buffer.concat([readFileSync(media), Buffer.from(" edited")]));
  assert.notEqual(sha256OfFile(media), expected, "modified previews must not match the approved checksum");
});
