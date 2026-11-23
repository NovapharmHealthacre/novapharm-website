import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

export const LIVE_ORIGIN = "https://novapharmhealthcare.com";
export const PUBLIC_ROUTES = Object.freeze([
  "/", "/legal/accessibility/", "/contact/", "/products/",
  "/capabilities/", "/oncology/"
]);

function attribute(tag, name) {
  assert.match(name, /^[a-z-]+$/i);
  return tag.match(new RegExp("\\b" + name + "\\s*=\\s*([\"'])(.*?)\\1", "i"))?.[2] ?? null;
}

function matches(html, tag, attributeName, expectedValue) {
  const tags = [...html.matchAll(new RegExp("<" + tag + "\\b[^>]*>", "gi"))]
    .map(match => match[0]);
  return tags.filter(value => attribute(value, attributeName)?.toLowerCase() === expectedValue.toLowerCase());
}

// Remove inert comment ranges with an explicit bounded scan, not a regex
// substitution. Reject malformed/nested comments rather than allowing them
// to manufacture active release receipts, headings or Contact form markers.
function stripInertHtmlComments(html) {
  const visible = [];
  let cursor = 0;
  while (cursor < html.length) {
    const start = html.indexOf("<!--", cursor);
    if (start === -1) {
      visible.push(html.slice(cursor));
      break;
    }
    const end = html.indexOf("-->", start + 4);
    assert.ok(end !== -1, "Unterminated HTML comment in public release evidence");
    const nested = html.indexOf("<!--", start + 4);
    assert.ok(nested === -1 || nested >= end,
      "Ambiguous nested HTML comment in public release evidence");
    visible.push(html.slice(cursor, start));
    cursor = end + 3;
  }
  return visible.join("");
}

export function verifyPublishedHtml(rawHtml, route, sourceSha) {
  assert.match(sourceSha, /^[a-f0-9]{40}$/, "Exact release commit SHA required");
  // A commented-out receipt, theme, H1, form, consent marker or CSP directive
  // is not active HTML. Never let inert markup satisfy a production release.
  const html = stripInertHtmlComments(rawHtml);
  const errors = [];
  if (!/<html\b[^>]*\blang=["']en(?:-[^"']*)?["']/i.test(html)) errors.push("English HTML language missing");
  if ((html.match(/<h1(?:\s[^>]*)?>/gi) ?? []).length !== 1) errors.push("Expected one H1");
  const receipt = matches(html, "meta", "name", "novapharm-source-sha");
  if (receipt.length !== 1 || attribute(receipt[0], "content") !== sourceSha)
    errors.push("Published source SHA absent, duplicated or not the exact release");
  const themes = matches(html, "meta", "name", "theme-color");
  if (themes.length !== 1 || attribute(themes[0], "content") !== "#FBFAEF")
    errors.push("Browser theme differs from approved Royal Mineral White");
  const masks = matches(html, "link", "rel", "mask-icon");
  if (masks.length > 1 || masks.some(tag => attribute(tag, "color") !== "#9D1B32"))
    errors.push("Safari mask-icon differs from approved Healthcare Crimson");
  if (route === "/contact/") {
    // The managed AWS-backed Contact form is separately pinned by its original
    // source blob. Verify critical live safety markers as well as the release
    // SHA; a superficially branded email-only or unconsented form must fail.
    const pinnedOrigin = "https://h4dc1e4u57.execute-api.eu-north-1.amazonaws.com";
    const reviewedForm = '<form class="ref-form" method="post" action="/contact/" ' +
      'data-live-b2b-enquiry-form data-api-origin="' + pinnedOrigin + '">';
    if (html.split(reviewedForm).length !== 2)
      errors.push("Reviewed AWS B2B Contact form or pinned API binding missing");
    if (!html.includes('src="/assets/js/contact-production.js"'))
      errors.push("Production Contact client missing");
    if (!html.includes("bd@novapharmhealthcare.com"))
      errors.push("Approved Contact email missing");
    if (html.includes("data-email-enquiry-form"))
      errors.push("Contact was downgraded to email-only");
    for (const field of ["safetyConfirmation", "privacyAcknowledgement"]) {
      if (!html.includes('name="' + field + '" value="yes" required'))
        errors.push("Required Contact confirmation missing: " + field);
    }
    if (!html.includes('href="/legal/privacy/#business-enquiries"'))
      errors.push("Contact business enquiry privacy notice missing");
    const cspTags = matches(html, "meta", "http-equiv", "Content-Security-Policy");
    const contactCsp = cspTags.length === 1 ? attribute(cspTags[0], "content") : null;
    const directives = contactCsp?.split(";").map(value => value.trim()).filter(Boolean) ?? [];
    const requiredDirectives = [
      "script-src 'self'", "connect-src 'self' " + pinnedOrigin,
      "object-src 'none'", "base-uri 'self'", "form-action 'none'"
    ];
    const uniqueExactDirective = expected => {
      const name = expected.split(" ")[0];
      return directives.filter(value => value.split(" ")[0] === name).length === 1 &&
        directives.includes(expected);
    };
    if (cspTags.length !== 1 || requiredDirectives.some(value => !uniqueExactDirective(value)))
      errors.push("Reviewed Contact CSP or API egress boundary missing");
    if (!html.includes('href="/assets/css/novapharm-unified-20261107.css"'))
      errors.push("Reviewed managed Contact design stylesheet missing");
    if (!html.includes('dir="auto"') || !html.includes('dir="ltr"'))
      errors.push("Contact RTL and LTR input direction support missing");
  }
  return errors;
}

export async function auditPublishedBrand({ sourceSha, fetchImpl = fetch } = {}) {
  assert.match(sourceSha || "", /^[a-f0-9]{40}$/, "Exact release commit SHA required");
  const results = [];
  for (const route of PUBLIC_ROUTES) {
    const row = { route, status: null, passed: false, errors: [] };
    try {
      const url = LIVE_ORIGIN + route + "?release_sha=" + sourceSha;
      const response = await fetchImpl(url, {
        method: "GET",
        redirect: "manual",
        headers: { Accept: "text/html", "Cache-Control": "no-cache, no-store, max-age=0" },
        signal: AbortSignal.timeout(20000)
      });
      row.status = response.status;
      if (response.status !== 200) throw Error("Unexpected HTTP status " + response.status);
      if (!(response.headers.get("content-type") || "").toLowerCase().includes("text/html"))
        throw Error("Response is not HTML");
      const declaredLength = Number(response.headers.get("content-length") || 0);
      if (declaredLength > 1600000) throw Error("HTML response exceeds budget");
      const html = await response.text();
      if (html.length > 1600000) throw Error("HTML response exceeds budget");
      row.errors.push(...verifyPublishedHtml(html, route, sourceSha));
    } catch (err) {
      row.errors.push(String(err?.message ?? err).slice(0, 180));
    }
    row.passed = row.errors.length === 0;
    results.push(row);
  }
  return { sourceSha, origin: LIVE_ORIGIN, total: PUBLIC_ROUTES.length,
    passed: results.filter(r => r.passed).length, results };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const sourceSha = process.env.GITHUB_SHA || "";
  const report = await auditPublishedBrand({ sourceSha });
  // No page bodies, private form fields or cloud responses are written to disk.
  for (const result of report.results) {
    console.log(result.route + ": HTTP " + result.status +
      ", " + (result.passed ? "VERIFIED" : "FAILED") +
      (result.errors.length ? " (" + result.errors.join("; ") + ")" : ""));
  }
  assert.equal(report.passed, report.total,
    "Six-route live release SHA, brand metadata or Contact safety verification failed");
  console.log("All six public routes match exact release " + sourceSha + " and approved browser branding.");
}
