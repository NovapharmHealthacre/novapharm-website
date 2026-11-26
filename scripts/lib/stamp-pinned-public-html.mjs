import assert from "node:assert/strict";
import {
  closeSync,
  constants,
  fstatSync,
  fsyncSync,
  ftruncateSync,
  openSync,
  readFileSync,
  writeSync
} from "node:fs";
import { resolve, sep } from "node:path";

// Open the generated HTML exactly once, without following the final symlink.
// Every check and write acts on the same pinned regular-file descriptor,
// eliminating the prior existsSync/read/write pathname race flagged by CodeQL.
export function stampPinnedPublicHtml(root, route, sha, { mustBeNoindex = false } = {}) {
  assert.match(sha, /^[0-9a-f]{40}$/, "Release identity must be a 40-character Git SHA");
  assert.match(route, /^(?!\/)(?!.*\.\.\/)[a-zA-Z0-9/_-]+\.html$/, "Unsafe public HTML route");
  const base = resolve(root);
  const full = resolve(base, route);
  assert.ok(full.startsWith(base + sep), "Refusing an HTML route outside the build root");
  assert.equal(typeof constants.O_NOFOLLOW, "number", "Secure no-follow file opening is required");

  const fd = openSync(full, constants.O_RDWR | constants.O_NOFOLLOW);
  try {
    assert.ok(fstatSync(fd).isFile(), "Public HTML source must be a regular file: " + route);
    let html = readFileSync(fd, "utf8");
    assert.ok(html.includes("</head>"), "Missing head element: " + route);
    if (mustBeNoindex) {
      assert.ok(html.includes('name="robots" content="noindex, nofollow"'),
        "Reviewed noindex marker missing: " + route);
    }
    html = html.replace(/\s*<meta name="novapharm-source-sha" content="[0-9a-f]{40}">/gi, "");
    html = html.replace("</head>", '  <meta name="novapharm-source-sha" content="' + sha + '">\n</head>');
    assert.equal((html.match(/name="novapharm-source-sha"/gi) ?? []).length, 1,
      "Duplicate or missing release source provenance: " + route);

    const bytes = Buffer.from(html, "utf8");
    let written = 0;
    while (written < bytes.length) {
      const count = writeSync(fd, bytes, written, bytes.length - written, written);
      assert.ok(count > 0, "Failed to write public source provenance: " + route);
      written += count;
    }
    // Resize and flush only after the complete new HTML was written to the
    // same descriptor. A swapped pathname cannot redirect these operations.
    ftruncateSync(fd, bytes.length);
    fsyncSync(fd);
    return bytes.length;
  } finally {
    closeSync(fd);
  }
}
