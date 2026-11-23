import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { LIVE_ORIGIN, PUBLIC_ROUTES, auditPublishedBrand, verifyPublishedHtml } from "./verify-public-brand-source-live.mjs";

const SHA = "a".repeat(40);

function htmlFor(route, sha = SHA) {
  const contact = route === "/contact/"
    ? '<form class="ref-form" method="post" action="/contact/" ' +
      'data-live-b2b-enquiry-form data-api-origin="https://h4dc1e4u57.execute-api.eu-north-1.amazonaws.com">' +
      '<input name="safetyConfirmation" value="yes" required>' +
      '<input name="privacyAcknowledgement" value="yes" required>' +
      '<input name="name" dir="auto"><input name="email" dir="ltr">' +
      '<a href="/legal/privacy/#business-enquiries">Privacy notice</a>' +
      '<a href="mailto:bd@novapharmhealthcare.com">Email</a>' +
      '<link rel="stylesheet" href="/assets/css/novapharm-unified-20261107.css">' +
      '<script src="/assets/js/contact-production.js" defer></script></form>'
    : "";
  return '<html lang="en-GB"><head><meta name="novapharm-source-sha" content="' + sha + '">' +
    '<meta name="theme-color" content="#FFFFFF">' +
    '<link rel="mask-icon" href="/fixtures/brand-mask.svg" color="#9D1B32">' +
    (route === "/contact/" ? '<meta http-equiv="Content-Security-Policy" content="script-src \'self\'; ' +
      'connect-src \'self\' https://h4dc1e4u57.execute-api.eu-north-1.amazonaws.com; ' +
      'object-src \'none\'; base-uri \'self\'; form-action \'none\'">' : '') +
    '</head><body><main><h1>NovaPharm Healthcare</h1>' + contact +
    '</main></body></html>';
}

test("six-route release auditor enforces a single official public origin", async () => {
  const seen = [];
  const fetchImpl = async (url, options) => {
    seen.push({url, options});
    return new Response(htmlFor(new URL(url).pathname), {status: 200,
      headers: {"content-type":"text/html; charset=utf-8"}});
  };
  const report = await auditPublishedBrand({sourceSha:SHA, fetchImpl});
  assert.equal(report.total, 6);
  assert.equal(report.passed, 6);
  assert.deepEqual(seen.map(item => new URL(item.url).pathname), PUBLIC_ROUTES);
  for (const item of seen) {
    assert.ok(item.url.startsWith(LIVE_ORIGIN + "/"));
    assert.equal(item.options.method, "GET");
    assert.equal(item.options.redirect, "manual");
  }
});

test("all four formerly missing SHA routes reject unstamped output", () => {
  for (const route of ["/", "/legal/accessibility/", "/contact/", "/products/"]) {
    const unproven = htmlFor(route).replace(/<meta name="novapharm-source-sha"[^>]+>/, "");
    assert.ok(verifyPublishedHtml(unproven, route, SHA).some(error => error.includes("source SHA")));
  }
});

test("misleading or stale SHA cannot be accepted for release", () => {
  const wrong = htmlFor("/", "b".repeat(40));
  assert.ok(verifyPublishedHtml(wrong, "/", SHA).some(error => error.includes("source SHA")));
  const duplicate = htmlFor("/").replace("</head>",
    '<meta name="novapharm-source-sha" content="' + SHA + '"></head>');
  assert.ok(verifyPublishedHtml(duplicate, "/", SHA).some(error => error.includes("source SHA")));
});

test("retired theme or Safari red cannot pass live acceptance", () => {
  assert.ok(verifyPublishedHtml(htmlFor("/").replace("#FFFFFF", "#E3120B"), "/", SHA)
    .some(error => error.includes("Pure White")));
  assert.ok(verifyPublishedHtml(htmlFor("/").replace("#9D1B32", "#E3120B"), "/", SHA)
    .some(error => error.includes("Crimson")));
});

test("Contact requires production AWS-backed form, client, BD address and no email-only downgrade", () => {
  for (const term of ["data-live-b2b-enquiry-form", "contact-production.js", "bd@novapharmhealthcare.com"]) {
    const broken = htmlFor("/contact/").replace(term, "broken");
    assert.notEqual(verifyPublishedHtml(broken, "/contact/", SHA).length, 0);
  }
  const downgraded = htmlFor("/contact/").replace("data-live-b2b-enquiry-form", "data-email-enquiry-form");
  assert.ok(verifyPublishedHtml(downgraded, "/contact/", SHA).length >= 1);
});

test("read-only auditor fails closed on HTTP redirects, errors or non-HTML content", async () => {
  const fetchImpl = async (url) => {
    const route = new URL(url).pathname;
    if (route === "/products/") return new Response("", {status: 302, headers:{location:"/other/"}});
    if (route === "/contact/") return new Response("{}", {status:200,headers:{"content-type":"application/json"}});
    return new Response(htmlFor(route),{status:200,headers:{"content-type":"text/html"}});
  };
  const report = await auditPublishedBrand({sourceSha:SHA, fetchImpl});
  assert.equal(report.passed, 4);
  assert.ok(report.results.find(row => row.route === "/products/").errors.length);
  assert.ok(report.results.find(row => row.route === "/contact/").errors.length);
});

test("invalid expected SHA cannot start a production audit", async () => {
  await assert.rejects(auditPublishedBrand({sourceSha:"not-a-commit",fetchImpl:async()=>{throw Error("should not be called");}}));
});

test("Contact release cannot pass with lost consent, CSP, approved API origin or RTL semantics", () => {
  const html = htmlFor("/contact/");
  assert.deepEqual(verifyPublishedHtml(html, "/contact/", SHA), []);
  const weakened = [
    ['name="safetyConfirmation" value="yes" required', 'name="safetyConfirmation"'],
    ['name="privacyAcknowledgement" value="yes" required', 'name="privacyAcknowledgement"'],
    ['http-equiv="Content-Security-Policy"', 'http-equiv="X-Unreviewed-Policy"'],
    ["script-src 'self'", "script-src 'self' 'unsafe-inline'"],
    ["form-action 'none'", "form-action 'self'"],
    ['connect-src \'self\' https://h4dc1e4u57.execute-api.eu-north-1.amazonaws.com', "connect-src 'self'"],
    ['data-api-origin="https://h4dc1e4u57.execute-api.eu-north-1.amazonaws.com"', 'data-api-origin="https://unreviewed.example.invalid"'],
    ['href="/legal/privacy/#business-enquiries"', 'href="/other/privacy"'],
    ['href="/assets/css/novapharm-unified-20261107.css"', 'href="/assets/css/unreviewed.css"'],
    ['dir="auto"', 'dir="bad"'],
    ['dir="ltr"', 'dir="bad"']
  ];
  for (const [before, after] of weakened) {
    assert.ok(html.includes(before), "Fixture lacks original safety marker " + before);
    const broken = html.replace(before, after);
    assert.ok(verifyPublishedHtml(broken, "/contact/", SHA).length > 0,
      "Contact safety regression undetected: " + before);
  }
});

test("a superficial B2B marker cannot impersonate the reviewed live Contact form", () => {
  const original = htmlFor("/contact/");
  const spoof = original.replace(
    '<form class="ref-form" method="post" action="/contact/" data-live-b2b-enquiry-form data-api-origin="https://h4dc1e4u57.execute-api.eu-north-1.amazonaws.com">',
    '<div data-live-b2b-enquiry-form>');
  assert.ok(verifyPublishedHtml(spoof, "/contact/", SHA).some(e => e.includes("pinned API binding")));
});

test("actual immutable managed Contact HTML satisfies all live release safety requirements", () => {
  // Synthetic fixtures are useful for negative cases, but they cannot
  // establish compatibility with the actual owner-reviewed Contact markup.
  const managed = readFileSync(new URL("../src/content/contact-managed-release.html", import.meta.url), "utf8");
  assert.ok(!managed.includes("novapharm-source-sha"), "Managed source must not forge publication receipts");
  const stamped = managed.replace("</head>",
    '<meta name="novapharm-source-sha" content="' + SHA + '">\n</head>');
  assert.notEqual(stamped, managed, "Reviewed Contact must include a closing head");
  // Keep the owner-reviewed AWS Contact source byte-identical; it predates the
  // new primary-white browser metadata. The old template must not be accepted
  // as already published under the superseding palette.
  assert.ok(stamped.includes('name="theme-color" content="#FBFAEF"'));
  assert.ok(verifyPublishedHtml(stamped, "/contact/", SHA)
    .some(error => error.includes("Pure White")));
  // Test only the browser-theme normalization in memory, while preserving
  // all managed Contact form, privacy, consent, CSP and API safety markers.
  const normalized = stamped.replace(
    'name="theme-color" content="#FBFAEF"',
    'name="theme-color" content="#FFFFFF"');
  assert.notEqual(normalized, stamped);
  assert.deepEqual(verifyPublishedHtml(normalized, "/contact/", SHA), []);
});

test("commented-out source receipts, brand colours and headings cannot satisfy live checks", () => {
  const good = htmlFor("/");
  const hiddenReceipt = good.replace(/(<meta name="novapharm-source-sha"[^>]*>)/,
    "<!-- $1 -->");
  assert.ok(verifyPublishedHtml(hiddenReceipt, "/", SHA).some(error => error.includes("source SHA")));
  const hiddenTheme = good.replace(/(<meta name="theme-color"[^>]*>)/, "<!-- $1 -->");
  assert.ok(verifyPublishedHtml(hiddenTheme, "/", SHA).some(error => error.includes("Pure White")));
  const hiddenH1 = good.replace("<h1>NovaPharm Healthcare</h1>",
    "<!-- <h1>NovaPharm Healthcare</h1> -->");
  assert.ok(verifyPublishedHtml(hiddenH1, "/", SHA).some(error => error.includes("one H1")));
  const inertExtra = good.replace("</head>", "<!-- <meta name=\"novapharm-source-sha\" content=\"stale\"> -->\n</head>");
  assert.deepEqual(verifyPublishedHtml(inertExtra, "/", SHA), [],
    "Inert duplicate metadata must not cause a false rejection");
});

test("HTML comments cannot impersonate the pinned managed Contact form", () => {
  const good = htmlFor("/contact/");
  const pinnedOpening = '<form class="ref-form" method="post" action="/contact/" ' +
    'data-live-b2b-enquiry-form data-api-origin="https://h4dc1e4u57.execute-api.eu-north-1.amazonaws.com">';
  assert.ok(good.includes(pinnedOpening));
  const spoof = good.replace(pinnedOpening, '<div data-live-b2b-enquiry-form>')
    .replace("</body>", "<!-- " + pinnedOpening + " -->\n</body>");
  assert.ok(verifyPublishedHtml(spoof, "/contact/", SHA)
    .some(error => error.includes("pinned API binding")),
    "Comment-only Contact markup must never count as the pinned active form");
});

test("malformed or nested HTML comments fail closed before public receipt verification", () => {
  const good = htmlFor("/");
  assert.deepEqual(verifyPublishedHtml(good, "/", SHA), []);
  const malformed = good.replace("</head>", "<!-- never closed</head>");
  assert.throws(() => verifyPublishedHtml(malformed, "/", SHA), /Unterminated HTML comment/);
  const nested = good.replace("</head>",
    '<!-- untrusted <!-- <meta name="novapharm-source-sha" content="' + SHA + '"> -->\n</head>');
  assert.throws(() => verifyPublishedHtml(nested, "/", SHA), /Ambiguous nested HTML comment/);
  const multiple = good.replace("</head>",
    '<!-- <h1>spoofed</h1> --><!-- <meta name="theme-color" content="#E3120B"> -->\n</head>');
  assert.deepEqual(verifyPublishedHtml(multiple, "/", SHA), [],
    "Separate inert comments cannot alter verified active metadata");
});
