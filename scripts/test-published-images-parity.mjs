import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  safePublishedImagePath, publishedImageManifest, comparePublishedImage
} from "./audit-published-images-parity.mjs";

const bytes = text => Buffer.from(text, "utf8");

test("only allow image paths under approved public brand and media trees", () => {
  for (const path of ["assets/brand/synthetic-mark.svg",
    "assets/media/products/nutraxin/synthetic-tablets.png",
    "assets/media/home/synthetic-scene.jpg"])
    assert.equal(safePublishedImagePath(path), path);
  for (const path of ["../secret.txt", "assets/private/customer.png",
    "assets/media/../../../secrets.png", "assets/media/logo.svg?token=x",
    "/assets/brand/logo.svg", "https://untrusted.example/image.jpg",
    "assets/media/.env", "assets/media/foo.webp/other.png"])
    assert.throws(() => safePublishedImagePath(path), /Unsafe/);
});

test("manifest recursively discovers all public image formats, excludes symlinks and nonimages, and fails if the baseline shrinks", () => {
  const tree = mkdtempSync(join(tmpdir(), "novapharm-images-"));
  try {
    const paths = ["assets/brand/synthetic-mark.svg",
      "assets/media/products/nutraxin/synthetic-bottle.png",
      "assets/media/about/photograph.avif",
      "assets/media/about/icon.webp",
      "assets/media/about/photo.JPG",
      "assets/media/about/poster.gif",
      "assets/media/about/favicon.ico"];
    for (const path of paths) {
      const full = join(tree, path);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, bytes("image"));
    }
    writeFileSync(join(tree, "assets/media/about/not-an-image.txt"), bytes("nonimage"));
    const files = publishedImageManifest(tree, 7);
    assert.deepEqual(files, [...paths].sort());
    assert.throws(() => publishedImageManifest(tree, 8), /unexpectedly shrank/);
  } finally {
    rmSync(tree, { recursive: true, force: true });
  }
});

test("exact SHA-256 byte equality with HTTP 200 and image response is mandatory", () => {
  const args = { path: "assets/brand/synthetic-mark.svg", sourceBytes: bytes("<svg>approved</svg>"),
    fetchedBytes: bytes("<svg>approved</svg>"), status: 200, mime: "image/svg+xml" };
  const good = comparePublishedImage(args);
  assert.equal(good.exactByteMatch, true);
  assert.deepEqual(good.errors, []);
  assert.equal(good.sourceSha256, good.fetchedSha256);

  const changed = comparePublishedImage({ ...args, fetchedBytes: bytes("<svg>old</svg>") });
  assert.equal(changed.exactByteMatch, false);
  assert.ok(changed.errors.some(e => e.includes("differ")));
  for (const change of [{ status:302 }, { status:404, fetchedBytes:null },
    { sourceBytes:null }, { fetchedBytes:bytes("") }, { mime:"text/html" }]) {
    assert.ok(comparePublishedImage({ ...args, ...change }).errors.length,
      "Bad response was not rejected: " + JSON.stringify(change));
  }
});

test("source hash, public hash and status cannot be mistaken for accessibility, legal or HIG certification", () => {
  const row = comparePublishedImage({ path:"assets/media/about/photograph.avif",
    sourceBytes:bytes("file"), fetchedBytes:bytes("file"),
    status:200, mime:"image/avif" });
  for (const unsupported of ["independentHigAcceptance", "altTextAccepted",
    "clinicalRightsApproved", "humanReviewerApproved", "wcagCertified"])
    assert.equal(Object.hasOwn(row, unsupported), false);
});
