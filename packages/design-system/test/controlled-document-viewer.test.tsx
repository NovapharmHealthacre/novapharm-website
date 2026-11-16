import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ControlledDocumentViewer, isRelativeAuthorisedDownload } from "../src/index.ts";

const access = {
  verified: true,
  mayRead: true,
  mayDownload: true,
  scope: "approved_recipients" as const,
  version: "v3",
  reviewedAt: "16 November 2026",
};

test("document previews and download links fail closed before access is verified", () => {
  const denied = renderToStaticMarkup(<ControlledDocumentViewer id="quality-record" title="Quality evidence"
    access={{ ...access, verified: false }}
    downloadHref="/gateway/private-document/123">PRIVATE CONTENT</ControlledDocumentViewer>);
  assert.match(denied, /Document preview unavailable/);
  assert.doesNotMatch(denied, /PRIVATE CONTENT|v3|Shared with approved recipients|<a /);
  const revoked = renderToStaticMarkup(<ControlledDocumentViewer id="quality-record" title="Quality evidence"
    access={{ ...access, mayRead: false }}
    downloadHref="/gateway/private-document/123">PRIVATE CONTENT</ControlledDocumentViewer>);
  assert.doesNotMatch(revoked, /PRIVATE CONTENT|<a /);
});

test("server-confirmed read access can render content, but only permitted downloads show", () => {
  const ok = renderToStaticMarkup(<ControlledDocumentViewer id="quality-record" title="Quality evidence"
    access={access} downloadHref="/gateway/private-document/123">NON-CONFIDENTIAL FIXTURE</ControlledDocumentViewer>);
  assert.match(ok, /NON-CONFIDENTIAL FIXTURE/);
  assert.match(ok, /Shared with approved recipients/);
  assert.match(ok, /Version/);
  assert.match(ok, /href="\/gateway\/private-document\/123"/);
  const readOnly = renderToStaticMarkup(<ControlledDocumentViewer id="quality-record" title="Quality evidence"
    access={{ ...access, mayDownload: false }} downloadHref="/gateway/private-document/123">PREVIEW</ControlledDocumentViewer>);
  assert.match(readOnly, /PREVIEW/);
  assert.doesNotMatch(readOnly, /Download authorised document/);
});

test("unverified or external download destinations never appear as direct links", () => {
  for (const href of ["https://example.org/private", "//example.org/private", "/\\evil", "/x%2fy", "/x%5cy", "/control#fragment", "javascript:alert(1)", ""]) {
    assert.equal(isRelativeAuthorisedDownload(href), false, href);
  }
  assert.equal(isRelativeAuthorisedDownload("/gateway/private-document/123?version=3"), true);
});
