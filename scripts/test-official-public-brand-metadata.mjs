import assert from "node:assert/strict";
import test from "node:test";
import {
  normaliseOfficialPublicBrandMetadata,
  assertOfficialPublicBrandMetadata,
  officialPublicBrandPalette
} from "./normalise-official-public-brand-metadata.mjs";

const palette = officialPublicBrandPalette();

test("approved public browser colours and Sovereign Black come from owner registry", () => {
  assert.equal(palette.background, "#FBFAEF");
  assert.equal(palette.crimson, "#9D1B32");
  assert.equal(palette.defaultInk, "#0B0B0E");
});

test("retired homepage and Products browser colours are corrected without changing page content", () => {
  const legacy = '<!doctype html><html lang="en-GB"><head><meta name="theme-color" content="#FFFFFF"><link rel="mask-icon" href="/assets/brand/safari-pinned-tab.svg" color="#E3120B"><title>Approved Earth page</title></head><body><main id="main"><h1>Medicine. Where it needs to be.</h1></main></body></html>';
  const result = normaliseOfficialPublicBrandMetadata(legacy, palette);
  assert.match(result, /name="theme-color" content="#FBFAEF"/);
  assert.match(result, /rel="mask-icon"[^>]*color="#9D1B32"/);
  assert.match(result, /Medicine\. Where it needs to be\./);
  assert.equal(normaliseOfficialPublicBrandMetadata(result, palette), result);
});

test("Next accessibility page may lack Safari mask; its CSP and hydrated scripts are untouched", () => {
  const legacy = '<html lang="en-GB"><head><meta http-equiv="Content-Security-Policy" content="script-src \'self\'"><meta name="theme-color" content="#E3120B"><script src="/_next/static/chunks/main.js"></script></head><body><main><h1>Accessibility</h1></main></body></html>';
  const result = normaliseOfficialPublicBrandMetadata(legacy, palette);
  assertOfficialPublicBrandMetadata(result, palette);
  assert.match(result, /http-equiv="Content-Security-Policy"/);
  assert.match(result, /_next\/static\/chunks\/main\.js/);
  assert.equal((result.match(/name="theme-color"/g) || []).length, 1);
});

test("current Contact palette stays unchanged and the protected form binding is preserved", () => {
  const contact = '<html><head><meta name="theme-color" content="#FBFAEF"></head><body><form data-live-b2b-enquiry-form data-api-origin="https://safe.example.invalid"><button type="submit">Send</button></form><a href="mailto:bd@novapharmhealthcare.com">Email</a><script src="/assets/js/contact-production.js" defer></script></body></html>';
  const result = normaliseOfficialPublicBrandMetadata(contact, palette);
  assert.equal(result, contact);
});

test("missing browser theme is added and approved mask colour is completed", () => {
  const input = '<html><head><link rel="mask-icon" href="/assets/brand/safari-pinned-tab.svg"></head><body><h1>Products</h1></body></html>';
  const result = normaliseOfficialPublicBrandMetadata(input, palette);
  assertOfficialPublicBrandMetadata(result, palette);
  assert.match(result, /rel="mask-icon"[^>]*color="#9D1B32"/);
});

test("duplicate or malformed metadata fails closed instead of silently claiming compliance", () => {
  const duplicate = '<head><meta name="theme-color" content="#FFFFFF"><meta name="theme-color" content="#E3120B"></head>';
  assert.throws(() => normaliseOfficialPublicBrandMetadata(duplicate, palette), /duplicate theme-color/i);
  assert.throws(() => normaliseOfficialPublicBrandMetadata('<body></body>', palette), /head/);
  const duplicateMask = '<head><link rel="mask-icon" href="/a.svg"><link rel="mask-icon" href="/b.svg"></head>';
  assert.throws(() => normaliseOfficialPublicBrandMetadata(duplicateMask, palette), /duplicate Safari mask-icon/i);
});

test("published-source SHA must never be manufactured by colour normalisation", () => {
  const input = '<html><head><meta name="theme-color" content="#E3120B"></head><body><h1>Example</h1></body></html>';
  const result = normaliseOfficialPublicBrandMetadata(input, palette);
  assert.doesNotMatch(result, /novapharm-source-sha/);
  const proven = input.replace('</head>', '<meta name="novapharm-source-sha" content="f0dcd3caaa18073f4a2632aa5c2e075cdfdd40b0"></head>');
  assert.match(normaliseOfficialPublicBrandMetadata(proven, palette), /novapharm-source-sha" content="f0dcd3caaa18073f4a2632aa5c2e075cdfdd40b0"/);
});
