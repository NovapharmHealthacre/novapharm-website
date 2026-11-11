import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// The policy article is a reviewed, checked-in source of truth. The broad
// page-rebuild pipeline regenerates standard legal-page shells; preserve the
// approved policy text while retaining updated generated head, nav and footer.
const legalPolicies = ["legal/cookies/index.html", "legal/privacy/index.html"].map((path) => {
  const file = fileURLToPath(new URL("../" + path, import.meta.url));
  const html = readFileSync(file, "utf8");
  const article = html.match(/<article class="legal-content">[\s\S]*?<\/article>/);
  if (!article) throw new Error("Reviewed legal-policy article missing: " + path);
  return { file, article: article[0] };
});

await import("./materialize-leadership-media.mjs");
await import("./build-pages.mjs");
await import("./apply-visual-refinement.mjs");
await import("./apply-module-media-sanity.mjs");
await import("./normalise-visual-css.mjs");
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

for (const { file, article } of legalPolicies) {
  const generated = readFileSync(file, "utf8");
  if (!/<article class="legal-content">[\s\S]*?<\/article>/.test(generated)) {
    throw new Error("Generated legal-policy article missing: " + file);
  }
  const approved = generated.replace(/<article class="legal-content">[\s\S]*?<\/article>/, article);
  writeFileSync(file, approved, "utf8");
}

// Apply the owner-approved About page after every source rewrite.
await import("./apply-about-editorial.mjs");

// Restore owner-approved Capabilities design after all shared page rewrites.
await import("./apply-capabilities-editorial.mjs");

// Apply approved, real-image Products presentation last.
await import("./apply-products-editorial.mjs");

// Version the final public CSS URLs so old Safari/edge caches cannot hide the approved logo.
// This must run after all editorial transforms and before release source-SHA stamping.
await import("./version-public-visual-assets.mjs");

// Stamp only the final generated public pages after all editorial transforms.
await import("./stamp-public-release-provenance.mjs");
