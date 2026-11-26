import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// The reviewed legal article AND its version/review metadata are checked-in
// sources of truth. Rebuild standard shells without restoring stale policy dates.
const legalPolicies = ["legal/cookies/index.html", "legal/privacy/index.html"].map((path) => {
  const file = fileURLToPath(new URL("../" + path, import.meta.url));
  const html = readFileSync(file, "utf8");
  const article = html.match(/<article class="legal-content">[\s\S]*?<\/article>/);
  const metadata = html.match(/<dl class="policy-meta">[\s\S]*?<\/dl>/);
  if (!article) throw new Error("Reviewed legal-policy article missing: " + path);
  if (!metadata) throw new Error("Reviewed legal-policy metadata missing: " + path);
  return { file, article: article[0], metadata: metadata[0] };
});

await import("./materialize-leadership-media.mjs");
await import("./build-pages.mjs");
await import("./apply-visual-refinement.mjs");
await import("./apply-module-media-sanity.mjs");
await import("./normalise-visual-css.mjs");
// Validate the HIG typography contract before generating the public release.
// This is the same governed contract used by the shared design-system checks.
await import("./test-official-typography-contract.mjs");
await import("./build-css-bundle.mjs");
await import("./normalise-visual-semantics.mjs");
await import("./apply-owner-corrections.mjs");
await import("./apply-pages-presentation-parity.mjs");
await import("./apply-corporate-product-discipline.mjs");
await import("./apply-esco-catalogue.mjs");
await import("./validate-contact-publication.mjs");
await import("./activate-contact-intake.mjs");
await import("./apply-global-distribution-foundation.mjs");
// Materialize approved Markets before SEO, attribution and release registers are generated.
await import("./apply-markets-editorial.mjs");
await import("./enhance-seo-authority.mjs");
await import("./reconcile-leadership-authority.mjs");
await import("./reconcile-article-authority.mjs");
await import("./reconcile-social-authority.mjs");
await import("./finalise-social-cards.mjs");
await import("./generate-nutraxin-shopping.mjs");
await import("./generate-structured-data-register.mjs");

for (const { file, article, metadata } of legalPolicies) {
  const generated = readFileSync(file, "utf8");
  if (!/<article class="legal-content">[\s\S]*?<\/article>/.test(generated)) {
    throw new Error("Generated legal-policy article missing: " + file);
  }
  if (!/<dl class="policy-meta">[\s\S]*?<\/dl>/.test(generated)) {
    throw new Error("Generated legal-policy metadata missing: " + file);
  }
  // Keep the reviewed effective/review dates and version in sync with the actual
  // published legal article, while retaining the current generated navigation.
  const approved = generated
    .replace(/<article class="legal-content">[\s\S]*?<\/article>/, article)
    .replace(/<dl class="policy-meta">[\s\S]*?<\/dl>/, metadata);
  writeFileSync(file, approved, "utf8");
}

// Apply the owner-approved About page after every source rewrite.
await import("./apply-about-editorial.mjs");

// Restore owner-approved Capabilities design after all shared page rewrites.
await import("./apply-capabilities-editorial.mjs");

// Apply approved, real-image Products presentation last.
await import("./apply-products-editorial.mjs");

// Generate one governed public search, then a cross-brand order-status lookup.
await import("./generate-commerce-marketplace.mjs");
await import("./generate-commerce-tracking.mjs");

// Keep Our Story discoverable in late-generated public footers before versioning.
await import("./apply-our-story-footer.mjs");

// Finalized static pages must all load the RTL layout bootstrap,
// including late-generated commerce, Marketplace and regulated legal pages.
// This MUST precede CSS URL versioning so both first and repeat builds hash
// the same complete stylesheet set, including standalone RTL assets.
// Generate the retail expansion before finalizing public HTML artifacts.
await import("./generate-retail-expansion.mjs");
// Browse-only source references; approved, purchasable product pages always win.
await import("./generate-connective-source-directory.mjs");
const { finalizePublicRtlArtifacts } = await import("./finalize-public-rtl.mjs");
finalizePublicRtlArtifacts();

// Version the final public CSS URLs so Safari/edge caches serve approved assets.
// Run after every HTML/style entrypoint exists, before source-SHA stamping.
await import("./version-public-visual-assets.mjs");

// Normalize the browser theme, Safari mask tint and signed Next.js hydration
// metadata before the authentic source SHA is stamped onto reviewed pages.
const { normaliseCanonicalPublicBrandMetadata } = await import("./normalise-official-public-brand-metadata.mjs");
normaliseCanonicalPublicBrandMetadata();

// Stamp only the final generated public pages after all editorial transforms.
await import("./stamp-public-release-provenance.mjs");
// Fail the public build if any late route override restores old browser chrome.
await import("./validate-royal-public-theme.mjs");
