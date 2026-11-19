import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NovaSymbol } from "../src/index.ts";

test("unlabelled functional symbols are hidden from assistive technology", () => {
  const html = renderToStaticMarkup(<NovaSymbol name="search" scale="small" />);
  assert.match(html, /class="np-symbol"/);
  assert.match(html, /aria-hidden="true"/);
  assert.match(html, /data-scale="small"/);
  assert.doesNotMatch(html, /aria-label=/);
});

test("independent meaning is announced without creating a focusable SVG", () => {
  const html = renderToStaticMarkup(<NovaSymbol name="alert-circle" label="Requires review" tone="warning" variant="filled" />);
  assert.match(html, /role="img"/);
  assert.match(html, /aria-label="Requires review"/);
  assert.match(html, /focusable="false"/);
  assert.match(html, /data-tone="warning"/);
  assert.match(html, /data-symbol-enclosure/);
  assert.doesNotMatch(html, /aria-hidden="true"/);
});

test("essential controls share the same viewBox, optical weight and scale grammar", () => {
  for (const name of ["menu", "close", "basket", "refresh", "sign-out"] as const) {
    const html = renderToStaticMarkup(<NovaSymbol name={name} weight="strong" scale="large" />);
    assert.match(html, /viewBox="0 0 24 24"/);
    assert.match(html, /data-weight="strong"/);
    assert.match(html, /data-scale="large"/);
  }
});
