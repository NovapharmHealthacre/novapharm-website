// Public ESCO Bag metadata must not inherit Products search and social identities.
export const ESCO_BAG_CANONICAL = "https://novapharmhealthcare.com/products/esco/bag/";
export const ESCO_BAG_TITLE = "Your ESCO Bag | NovaPharm";
export const ESCO_BAG_DESCRIPTION = "Review selected ESCO catalogue items. Pricing, availability and ordering eligibility require product-specific confirmation.";

export function applyEscoBagMetadata(document) {
  let html = document;
  const fields = [
    ["title", /<title>[^<]*<\/title>/i, `<title>${ESCO_BAG_TITLE}</title>`],
    ["description", /<meta name="description" content="[^"]*">/i, `<meta name="description" content="${ESCO_BAG_DESCRIPTION}">`],
    ["robots", /<meta name="robots" content="[^"]*">/i, '<meta name="robots" content="noindex, follow">'],
    ["canonical", /<link rel="canonical" href="[^"]*">/i, `<link rel="canonical" href="${ESCO_BAG_CANONICAL}">`],
    ["og:url", /<meta property="og:url" content="[^"]*">/i, `<meta property="og:url" content="${ESCO_BAG_CANONICAL}">`],
    ["og:title", /<meta property="og:title" content="[^"]*">/i, `<meta property="og:title" content="${ESCO_BAG_TITLE}">`],
    ["og:description", /<meta property="og:description" content="[^"]*">/i, `<meta property="og:description" content="${ESCO_BAG_DESCRIPTION}">`],
    ["twitter:title", /<meta name="twitter:title" content="[^"]*">/i, `<meta name="twitter:title" content="${ESCO_BAG_TITLE}">`],
    ["twitter:description", /<meta name="twitter:description" content="[^"]*">/i, `<meta name="twitter:description" content="${ESCO_BAG_DESCRIPTION}">`],
  ];
  for (const [field, matcher, replacement] of fields) {
    if (!matcher.test(html)) throw Error("ESCO Bag template missing required metadata: " + field);
    html = html.replace(matcher, replacement);
  }
  // The Bag is a customer-specific interface, not the public Products WebPage.
  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/gi, "");
  if ((html.match(/<meta name="robots"/gi) || []).length !== 1 ||
      html.includes('<meta property="og:url" content="https://novapharmhealthcare.com/products/">')) {
    throw Error("ESCO Bag inherited duplicate or incorrect public indexing metadata");
  }
  return html;
}
