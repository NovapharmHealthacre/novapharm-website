import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import {
  normaliseOfficialPublicBrandMetadata,
  assertOfficialPublicBrandMetadata,
  officialPublicBrandPalette,
  normaliseCanonicalPublicBrandMetadata
} from "./normalise-official-public-brand-metadata.mjs";

const palette = officialPublicBrandPalette();

test("approved public browser colours and Sovereign Black come from owner registry", () => {
  assert.equal(palette.background, "#FBFAEF");
  assert.equal(palette.crimson, "#9D1B32");
  assert.equal(palette.defaultInk, "#0B0B0E");
});

test("retired homepage and Products browser colours are corrected without changing page content", () => {
  const legacy = '<!doctype html><html lang="en-GB"><head><meta name="theme-color" content="#FFFFFF"><link rel="mask-icon" href="/fixtures/brand-mask.svg" color="#E3120B"><title>Approved Earth page</title></head><body><main id="main"><h1>Medicine. Where it needs to be.</h1></main></body></html>';
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
  const input = '<html><head><link rel="mask-icon" href="/fixtures/brand-mask.svg"></head><body><h1>Products</h1></body></html>';
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


test("whole canonical release fixture updates all six key routes plus 54 registered pages, then is idempotent", t => {
  const root = mkdtempSync(join(tmpdir(), "novapharm-brand-metadata-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, "config"), { recursive: true });
  mkdirSync(join(root, "seo/generated"), { recursive: true });
  const ownerRegistry = {
    approvedOn: "2026-11-22",
    neutralPalette: {
      primaryWhite: {hex:"#FBFAEF"}, secondaryWhite: {hex:"#F8F7F3"},
      defaultInk: {hex:"#0B0B0E"}
    },
    brands: { healthcare: {hex:"#9D1B32"} }
  };
  writeFileSync(join(root, "config/brand-identities.json"), JSON.stringify(ownerRegistry));
  const keyRoutes = [
    "index.html", "legal/accessibility/index.html", "contact/index.html",
    "products/index.html", "capabilities/index.html", "oncology/index.html"
  ];
  const routes = [...keyRoutes, ...Array.from({length:54}, (_,i) => `fixture-${i}/index.html`)];
  writeFileSync(join(root, "seo/generated/page-metadata-register.json"),
    JSON.stringify(routes.map(file => ({file}))));
  for (const route of routes) {
    const file = join(root, route);
    mkdirSync(dirname(file), {recursive:true});
    writeFileSync(file, `<!DOCTYPE html><html lang="en-GB"><head><meta name="theme-color" content="#E3120B"><link rel="mask-icon" href="/fixtures/brand-mask.svg" color="#E3120B"></head><body><main><h1>${route}</h1></main></body></html>`);
  }
  assert.deepEqual(normaliseCanonicalPublicBrandMetadata(root), {checked:60, changed:60});
  for (const route of routes) {
    const html = readFileSync(join(root, route), "utf8");
    assertOfficialPublicBrandMetadata(html, palette);
    assert.doesNotMatch(html, /novapharm-source-sha/,
      "Colour normalization is not an attestation of deployed source");
  }
  assert.deepEqual(normaliseCanonicalPublicBrandMetadata(root), {checked:60, changed:0});
});


test("legacy Next Flight theme and strict CSP script hashes are updated together, not bypassed", () => {
  const flight = "self.__next_f.push(" + JSON.stringify([1, '18:[["meta",' +
    JSON.stringify({name:"theme-color",content:"#E3120B"}) + ']]']) + ")";
  const digest = value => createHash("sha256").update(value, "utf8").digest("base64");
  const originalHash = digest(flight);
  const html = '<html><head><meta name="theme-color" content="#E3120B">' +
    '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; ' +
    'script-src \'self\' \'sha256-' + originalHash + '\'; object-src \'none\'">' +
    '</head><body><script>' + flight + '</script></body></html>';
  const result = normaliseOfficialPublicBrandMetadata(html, palette);
  assertOfficialPublicBrandMetadata(result, palette);
  const changedFlight = result.split("<script>")[1]?.split("</script>")[0];
  assert.ok(changedFlight, "Next hydration script must still be present");
  assert.match(changedFlight, /theme-color/);
  assert.match(changedFlight, /#FBFAEF/);
  assert.doesNotMatch(changedFlight, /#E3120B/i);
  assert.match(result, /object-src 'none'/);
  assert.match(result, /script-src 'self'/);
  assert.ok(result.includes("'sha256-" + digest(changedFlight) + "'"));
  assert.ok(!result.includes("'sha256-" + originalHash + "'"));
  assert.equal(normaliseOfficialPublicBrandMetadata(result, palette), result,
    "Normalized page with valid regenerated CSP must remain byte-identical");
});

test("Next Flight rewrite refuses missing or mismatched CSP signatures", () => {
  const flight = "self.__next_f.push(" + JSON.stringify([1, '18:[["meta",' +
    JSON.stringify({name:"theme-color",content:"#E3120B"}) + ']]']) + ")";
  const page = head => '<html><head><meta name="theme-color" content="#E3120B">' +
    head + '</head><body><script>' + flight + '</script></body></html>';
  assert.throws(() => normaliseOfficialPublicBrandMetadata(page(""), palette),
    /verifiable inline CSP/);
  const wrongHash = '<meta http-equiv="Content-Security-Policy" content="script-src \'self\' \'sha256-invalid\'">';
  assert.throws(() => normaliseOfficialPublicBrandMetadata(page(wrongHash), palette),
    /matching original CSP hash/);
});

test("Next Flight literal replacement tokens remain intact when viewport metadata is updated", () => {
  const tokens = ["$&", "$`", "$'"];
  const flight = "self.__next_f.push(" + JSON.stringify([1,
    '18:[["meta",' + JSON.stringify({name:"theme-color",content:"#E3120B"}) +
    ']] ' + tokens.join(" ")]) + ")";
  const digest = value => createHash("sha256").update(value, "utf8").digest("base64");
  const csp = "<meta http-equiv=\"Content-Security-Policy\" content=\"script-src 'self' 'sha256-" +
    digest(flight) + "'\">";
  const input = '<html><head><meta name="theme-color" content="#E3120B">' +
    csp + '</head><body><script>' + flight + '</script></body></html>';
  const result = normaliseOfficialPublicBrandMetadata(input, palette);
  const body = result.split("<script>")[1]?.split("</script>")[0];
  assert.ok(body);
  for (const token of tokens) assert.ok(body.includes(token), "Lost literal Flight token " + token);
  assert.match(body, /#FBFAEF/);
  assert.doesNotMatch(body, /#E3120B/);
  assert.ok(result.includes("'sha256-" + digest(body) + "'"));
  assert.equal(normaliseOfficialPublicBrandMetadata(result, palette), result);
});


test("mixed-case script tags and whitespace closing tags preserve CSP-pinned Next hydration", () => {
  const flight = "self.__next_f.push(" + JSON.stringify([1, '18:[["meta",' +
    JSON.stringify({ name: "theme-color", content: "#E3120B" }) + ']]']) + ")";
  const digest = text => createHash("sha256").update(text, "utf8").digest("base64");
  const input = '<html><head><meta name="theme-color" content="#E3120B">' +
    '<meta http-equiv="Content-Security-Policy" content="script-src \'self\' \'sha256-' +
    digest(flight) + '\'"></head><body><!-- <script>ignore</script> -->' +
    '<SCRIPT data-note="a>b">' + flight + '</ScRiPt \t\n></body></html>';
  const result = normaliseOfficialPublicBrandMetadata(input, palette);
  assertOfficialPublicBrandMetadata(result, palette);
  assert.ok(result.includes('<SCRIPT data-note="a>b">'));
  assert.ok(result.includes("</ScRiPt \t\n>"));
  assert.match(result, /#FBFAEF/);
  assert.doesNotMatch(result, /#E3120B/);
  assert.ok(result.includes("'sha256-" + digest(flight.replace("#E3120B", "#FBFAEF")) + "'"));
  assert.equal(normaliseOfficialPublicBrandMetadata(result, palette), result);
});

test("ambiguous script closing tags fail closed, not skipped by a regex", () => {
  const html = '<html><head><meta name="theme-color" content="#E3120B"></head>' +
    '<body><script>self.__next_f.push([])</script \t\n fake></body></html>';
  assert.throws(() => normaliseOfficialPublicBrandMetadata(html, palette),
    /Ambiguous script end tag/);
});


test("four checked-in first-party public routes have approved browser chrome before publication", () => {
  const routes = [
    "legal/accessibility/index.html",
    "products/index.html",
    "capabilities/index.html",
    "oncology/index.html"
  ];
  for (const route of routes) {
    const html = readFileSync(route, "utf8");
    const endHead = html.indexOf("</head>");
    assert.ok(endHead > 0, "Missing public head: " + route);
    const head = html.slice(0, endHead);
    assert.equal((head.match(/name="theme-color"/g) || []).length, 1, route);
    assert.match(head, /<meta name="theme-color" content="#FBFAEF">/, route);
    assert.equal((head.match(/rel="mask-icon"/g) || []).length, 1, route);
    assert.match(head, /<link rel="mask-icon"[^>]*color="#9D1B32"/, route);
    assert.doesNotMatch(head, /#E3120B/i, "Retired browser red in " + route);
  }
});

test("all 19 actual Nutraxin storefronts normalize approved browser chrome without changing commerce or source receipts", () => {
  const products = JSON.parse(readFileSync("assets/data/nutraxin-retail-catalogue.json", "utf8")).products;
  assert.equal(products.length, 19, "Approved retail catalogue must retain 19 distinct SKUs");
  assert.equal(new Set(products.map(product => product.slug)).size, products.length);
  const schemaScripts = html => [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map(match => match[1]);
  const releaseMarkers = html => [...html.matchAll(/<meta\b[^>]*\bname=["']novapharm-source-sha["'][^>]*>/gi)]
    .map(match => match[0]);
  for (const product of products) {
    const file = "products/nutraxin/" + product.slug + "/index.html";
    const html = readFileSync(file, "utf8");
    const originalBody = html.slice(html.search(/<body\b/i));
    assert.ok(originalBody.startsWith("<body"), "Published body boundary missing: " + file);
    assert.ok(html.includes('data-merchant-sku="' + product.sku + '"'),
      "Exact Nutraxin retail SKU missing: " + file);
    const normalized = normaliseOfficialPublicBrandMetadata(html, palette);
    assertOfficialPublicBrandMetadata(normalized, palette);
    assert.match(normalized, /<meta\b[^>]*\bname=["']theme-color["'][^>]*\bcontent=["']#FBFAEF["']/i,
      "Royal Mineral White browser theme missing: " + file);
    assert.equal(normalized.slice(normalized.search(/<body\b/i)), originalBody,
      "Brand metadata may not modify retail content, prices, checkout or safety wording: " + file);
    assert.deepEqual(schemaScripts(normalized), schemaScripts(html),
      "Brand metadata may not change product Offer or canonical structured data: " + file);
    assert.deepEqual(releaseMarkers(normalized), releaseMarkers(html),
      "Browser normalisation cannot invent a published source SHA: " + file);
    assert.equal(normaliseOfficialPublicBrandMetadata(normalized, palette), normalized,
      "Retail colour normalisation must be idempotent: " + file);
  }
});
