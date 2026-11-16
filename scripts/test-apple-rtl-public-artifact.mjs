import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { finalizePublicRtlArtifacts, publicRtlFiles, validatePublicRtlArtifacts } from "./finalize-public-rtl.mjs";

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "np-rtl-public-"));
  for (const name of ["assets/js/rtl-localization.js", "assets/css/rtl-localization.css"]) {
    const path = join(root, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, "/* approved functional preference */");
  }
  const names = ["index.html", "404.html", "500.html", "portal/index.html"];
  for (let index = 0; index < 52; index += 1) {
    names.push("about/sample-" + index + "/index.html");
  }
  for (const name of names) {
    const path = join(root, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, '<!doctype html><html lang="en-GB"><head><title>Reviewed English</title>' +
      '<link rel="stylesheet" href="/assets/css/novapharm.bundle.css"></head>' +
      '<body><main class="content">Regulated and legal text stays English.</main></body></html>');
  }
  // A protected workspace may exist in the build root, but must not be
  // modified or admitted to the public release.
  const privatePage = join(root, "_secure/customer/index.html");
  mkdirSync(dirname(privatePage), { recursive: true });
  writeFileSync(privatePage, '<html><main>Secret portal data</main></html>');
  return { root, names, privatePage };
}

test("finalize public RTL after all editorial transforms; idempotent without touching private routes", () => {
  const { root, names, privatePage } = fixture();
  try {
    assert.equal(publicRtlFiles(root).length, names.length);
    const originalPrivate = readFileSync(privatePage, "utf8");
    const first = finalizePublicRtlArtifacts(root);
    assert.equal(first.total, names.length);
    assert.equal(first.updated, names.length);
    assert.equal(finalizePublicRtlArtifacts(root).updated, 0, "Must be safe if a publisher retries");
    assert.equal(validatePublicRtlArtifacts(root).valid, names.length);
    assert.equal(readFileSync(privatePage, "utf8"), originalPrivate);
    const publicPage = readFileSync(join(root, "index.html"), "utf8");
    assert.match(publicPage, /<main class="content" lang="en-GB" data-np-untranslated>/);
    assert.match(publicPage, /Regulated and legal text stays English/);
    assert.equal((publicPage.match(/rtl-localization\.js/g) || []).length, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("public RTL can attach its CSS to pages outside the legacy shared CSS bundle", () => {
  const { root } = fixture();
  try {
    const file = join(root, "about/sample-0/index.html");
    writeFileSync(file, '<html><head><title>Technology workspace</title></head><body>' +
      '<main id="main"><p>English</p></main></body></html>');
    finalizePublicRtlArtifacts(root);
    const html = readFileSync(file, "utf8");
    assert.ok(html.includes('href="/assets/css/rtl-localization.css"'));
    assert.equal(validatePublicRtlArtifacts(root).valid, 56);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("missing RTL bootstrap or an untranslated English main blocks release", () => {
  const { root } = fixture();
  try {
    finalizePublicRtlArtifacts(root);
    const page = join(root, "about/sample-2/index.html");
    writeFileSync(page, readFileSync(page, "utf8").replace(' lang="en-GB" data-np-untranslated', ""));
    assert.throws(() => validatePublicRtlArtifacts(root), /Untranslated English main landmark/);
    finalizePublicRtlArtifacts(root);
    rmSync(join(root, "assets/js/rtl-localization.js"));
    assert.equal(existsSync(join(root, "assets/js/rtl-localization.js")), false);
    assert.throws(() => validatePublicRtlArtifacts(root), /RTL bootstrap or CSS missing/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
