import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("privacy overview presents meaningful controls before the complete legal notice", () => {
  const html = source("legal/privacy/index.html");
  const firstArticle = html.indexOf('<article class="legal-content">');
  const overview = html.indexOf('<section class="np-privacy-overview"');
  const fullNotice = html.indexOf("<h2>1. Controller and privacy contact</h2>");
  const metadataAside = html.indexOf("<aside>", html.indexOf('<div class="container legal-layout">'));
  assert.ok(firstArticle >= 0 && overview > firstArticle && fullNotice > overview);
  assert.ok(metadataAside > firstArticle, "Privacy overview must precede legal metadata in semantic reading order");
  assert.match(html, /<section class="np-privacy-overview" id="privacy-overview" aria-labelledby="np-privacy-overview-title">/);
  assert.match(html, /<h2 id="np-privacy-overview-title">Your information\. Your choice\.<\/h2>/);
  assert.match(html, /class="np-privacy-primary-action" type="button" data-cookie-settings/);
  assert.match(html, /class="np-privacy-secondary-action" href="\/contact\/\?enquiry=General%20enquiry"/);
  assert.match(html, /<nav class="np-privacy-topic-links" aria-label="Explore this privacy notice">/);
  assert.match(html, /<ul class="np-privacy-principles" aria-label="Three privacy commitments">/);
  assert.match(html, /<dl class="policy-meta">/);
  assert.match(html, /Version<\/dt><dd>1\.4/);
  assert.match(html, /legal review pending/);
  assert.match(html, /<section id="privacy-controls">/);
  assert.match(html, /<section id="protected-device-resources">/);
  assert.match(html, /<section id="optional-website-analytics">/);
  assert.match(html, /<section id="privacy-recipients">/);
  assert.match(html, /id="privacy-by-design"/);
  assert.doesNotMatch(html, /<meta name="novapharm-ga4-id"/);
  for (const fragment of [
    "business-enquiries", "optional-website-analytics", "privacy-by-design",
    "privacy-controls", "protected-device-resources", "privacy-recipients"
  ]) {
    assert.ok(html.includes('href="#' + fragment + '"'), "Missing in-page privacy link: " + fragment);
    assert.ok(html.includes('id="' + fragment + '"'), "Broken in-page privacy target: " + fragment);
  }
});

test("NovaPharm privacy editorial appearance is responsive and independent of Apple trade dress", () => {
  const css = source("assets/css/corporate-product-discipline.css");
  const bundle = source("assets/css/novapharm.bundle.css");
  const html = source("legal/privacy/index.html");
  assert.ok(bundle.includes(css.trim()), "The generated public bundle must contain the exact approved CSS source");
  assert.match(css, /body\[data-page="legal\/privacy"\] \.np-privacy-overview/);
  assert.match(css, /--npd-system/);
  assert.match(css, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /grid-template-areas: "privacy-aside privacy-article"/);
  assert.match(css, /grid-template-areas: "privacy-article" "privacy-aside"/);
  assert.match(css, /@media \(max-width: 860px\)/);
  assert.match(css, /@media \(max-width: 560px\)/);
  assert.match(css, /@media \(prefers-contrast: more\)/);
  assert.match(css, /@media \(forced-colors: active\)/);
  assert.match(css, /focus-visible/);
  assert.match(css, /min-height: 46px/);
  for (const label of [".np-privacy-overview .np-privacy-eyebrow", ".np-privacy-topic-links .np-privacy-topic-label"]) {
    const marker = `body[data-page="legal/privacy"] ${label} {`;
    const start = css.indexOf(marker);
    assert.ok(start >= 0, `Missing privacy label: ${label}`);
    const rule = css.slice(start, css.indexOf("}", start) + 1);
    assert.ok(rule.includes("font-size: var(--np-type-caption-size, 0.875rem);"), `Privacy caption must use governed 14px token: ${label}`);
  }
  assert.doesNotMatch(html, /apple\.com\/privacy\/|apple-logo\.svg|apple-intelligence\.png/);
});

test("public rebuild preserves the reviewed privacy overview and legal metadata", () => {
  const builder = source("scripts/build-site.mjs");
  const pageBuilder = source("scripts/build-public-pages.mjs");
  assert.ok(pageBuilder.includes('slug === "legal/privacy" ? article + aside : aside + article'), "Privacy HTML generation must put controls before the metadata aside");
  assert.match(builder, /const legalPolicies = \[/);
  assert.ok(builder.includes('<article class="legal-content">'), "Build must retain reviewed legal article source");
  assert.ok(builder.includes('<dl class="policy-meta">'), "Build must retain policy version/review metadata");
  assert.match(builder, /\.replace\(\/<article class=/);
  assert.match(builder, /\.replace\(\/<dl class=/);
});

test("the guarded publisher verifies the redesigned Privacy page on the actual custom domain", () => {
  const publisher = source(".github/workflows/publish-aws-contact-production.yml");
  assert.ok(publisher.includes("https://novapharmhealthcare.com/legal/privacy/?"), "Verify the public canonical route");
  assert.ok(publisher.includes("grep -Fq 'class=\"np-privacy-overview\"' /tmp/novapharm-live-privacy.html"),
    "Do not report successful Privacy redesign delivery if the overview is not served");
  assert.ok(publisher.includes("grep -Fq 'Your information. Your choice.' /tmp/novapharm-live-privacy.html"),
    "Live publisher must assert the editorial heading");
  assert.ok(publisher.includes("grep -Fq 'class=\"np-privacy-primary-action\"' /tmp/novapharm-live-privacy.html"),
    "Live publisher must assert the primary cookie-control action");
});
