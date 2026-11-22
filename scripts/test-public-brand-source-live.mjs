import assert from "node:assert/strict";
import test from "node:test";
import { LIVE_ORIGIN, PUBLIC_ROUTES, auditPublishedBrand, verifyPublishedHtml } from "./verify-public-brand-source-live.mjs";

const SHA = "a".repeat(40);

function htmlFor(route, sha = SHA) {
  const contact = route === "/contact/"
    ? '<form data-live-b2b-enquiry-form><button type="submit">Send</button></form>' +
      '<a href="mailto:bd@novapharmhealthcare.com">Email</a>' +
      '<script src="/assets/js/contact-production.js" defer></script>'
    : "";
  return '<html lang="en-GB"><head><meta name="novapharm-source-sha" content="' + sha + '">' +
    '<meta name="theme-color" content="#FBFAEF">' +
    '<link rel="mask-icon" href="/assets/brand/safari-pinned-tab.svg" color="#9D1B32">' +
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
  assert.ok(verifyPublishedHtml(htmlFor("/").replace("#FBFAEF", "#E3120B"), "/", SHA)
    .some(error => error.includes("Royal Mineral White")));
  assert.ok(verifyPublishedHtml(htmlFor("/").replace("#9D1B32", "#E3120B"), "/", SHA)
    .some(error => error.includes("Crimson")));
});

test("Contact requires production AWS-backed form, client, BD address and no email-only downgrade", () => {
  for (const term of ["data-live-b2b-enquiry-form", "contact-production.js", "bd@novapharmhealthcare.com"]) {
    const broken = htmlFor("/contact/").replace(term, "broken");
    assert.notEqual(verifyPublishedHtml(broken, "/contact/", SHA).length, 0);
  }
  const downgraded = htmlFor("/contact/").replace("<form data-live-b2b-enquiry-form>", "<form data-email-enquiry-form>");
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
