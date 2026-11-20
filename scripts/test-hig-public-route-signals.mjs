import assert from "node:assert/strict";
import test from "node:test";
import { inspectPublicHigSignals } from "./hig-public-route-signals.mjs";

const sha = "a".repeat(40);

test("inspects a public document's language, responsive viewport, heading, skip target and source SHA", () => {
  const html = '<!doctype html><html dir="ltr" lang="en-GB"><head>' +
    '<meta content="width=device-width,initial-scale=1" name="viewport">' +
    '<meta name="novapharm-source-sha" content="' + sha + '"></head><body>' +
    '<a href="#main-content" class="skip-link">Skip to main content</a>' +
    '<main id="main-content"><h1>NovaPharm</h1></main></body></html>';
  const result = inspectPublicHigSignals(html);
  assert.equal(result.language, "en-GB");
  assert.equal(result.responsiveViewport, true);
  assert.equal(result.h1Elements, 1);
  assert.equal(result.skipLinkWithTarget, true);
  assert.equal(result.deployedSourceSha, sha);
  assert.deepEqual(result.warnings, []);
  assert.equal(result.evidenceLevel, "unauthenticated-ssr-markup-only");
});

test("no visual or production acceptance is inferred from markup alone", () => {
  const result = inspectPublicHigSignals('<html><head></head><body><h1>A</h1><h1>B</h1></body></html>');
  assert.equal(result.language, null);
  assert.equal(result.responsiveViewport, false);
  assert.equal(result.h1Elements, 2);
  assert.equal(result.skipLinkWithTarget, false);
  assert.equal(result.deployedSourceSha, null);
  assert.equal(result.warnings.length, 5);
  assert.equal("acceptedHigTopics" in result, false);
  assert.equal("wcagCertified" in result, false);
});

test("a visible bypass link without its target does not qualify", () => {
  const html = '<html lang="en"><head><meta name="viewport" content="width=device-width"></head>' +
    '<body><a class="portal-skip-link" href="#missing">Skip</a><main><h1>Portal</h1></main></body></html>';
  assert.equal(inspectPublicHigSignals(html).skipLinkWithTarget, false);
});

test("the parser never executes or follows links and accepts no non-string input", () => {
  assert.throws(() => inspectPublicHigSignals({ html: "<html>" }), TypeError);
  const html = '<html lang="en"><meta name="viewport" content="width=device-width">' +
    '<a class="skip-link" href="https://other.example/unsafe">Skip</a>' +
    '<main id="main"><h1>Home</h1></main></html>';
  assert.equal(inspectPublicHigSignals(html).skipLinkWithTarget, false);
});
