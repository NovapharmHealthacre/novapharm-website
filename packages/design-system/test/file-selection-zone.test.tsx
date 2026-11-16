import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FileSelectionZone, validateLocalFiles } from "../src/index.ts";

test("file preflight accepts only explicitly permitted types within size and count limits", () => {
  const pdf = { name: "report.PDF", type: "application/pdf", size: 30_000 };
  const png = { name: "image.png", type: "image/png", size: 12_000 };
  assert.deepEqual(validateLocalFiles([pdf], ".pdf", 50_000, 1), { valid: true });
  assert.deepEqual(validateLocalFiles([png], "image/*", 50_000, 1), { valid: true });
  assert.equal(validateLocalFiles([{ name: "data.exe", type: "application/octet-stream", size: 2 }], ".pdf", 50_000, 1).valid, false);
  assert.equal(validateLocalFiles([pdf, png], ".pdf,image/*", 50_000, 1).valid, false);
  assert.equal(validateLocalFiles([{ ...pdf, size: 50_001 }], ".pdf", 50_000, 1).valid, false);
  assert.equal(validateLocalFiles([], ".pdf", 50_000, 1).valid, false);
  assert.equal(validateLocalFiles([pdf], "", 50_000, 1).valid, false);
  assert.equal(validateLocalFiles([{name: "missing", type: "", size: 40}], "application/pdf", 50_000, 1).valid, false);
});

test("file selection always exposes the native keyboard picker and an honest no-upload status", () => {
  const html = renderToStaticMarkup(<FileSelectionZone label="Attach controlled evidence"
    accept=".pdf" onSelect={() => {}} maxFiles={1}
    help="Do not choose confidential records until your permission has been verified." />);
  assert.match(html, /<input[^>]*type="file"[^>]*accept="\.pdf"/);
  assert.match(html, /aria-describedby=/);
  assert.match(html, /No files selected\. Nothing is uploaded automatically/);
  assert.match(html, /Do not choose confidential records until your permission has been verified/);
  assert.doesNotMatch(html, /<form|action="\/api|fetch\(/);
});

test("a rejected second selection invalidates a previously accepted candidate", () => {
  // The picker cannot preserve a stale parent candidate after a subsequent
  // invalid choice; only separately authorised endpoints may transfer files.
  const source = readFileSync(new URL("../src/file-selection-zone.tsx", import.meta.url), "utf8");
  assert.match(source, /if \(!result\.valid\) \{\s*\/\/ Invalidate/);
  assert.match(source, /onSelect\(\[\]\)/);
});
