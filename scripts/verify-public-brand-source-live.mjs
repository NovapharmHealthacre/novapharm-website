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

export function verifyPublishedHtml(html, route, sourceSha) {
  assert.match(sourceSha, /^[a-f0-9]{40}$/, "Exact release commit SHA required");
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
    if (!html.includes("data-live-b2b-enquiry-form")) errors.push("Verified live B2B Contact form missing");
    if (!html.includes("/assets/js/contact-production.js")) errors.push("Production Contact client missing");
    if (!html.includes("bd@novapharmhealthcare.com")) errors.push("Approved Contact email missing");
    if (html.includes("data-email-enquiry-form")) errors.push("Contact was downgraded to email-only");
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
