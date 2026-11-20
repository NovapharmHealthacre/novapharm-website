import assert from "node:assert/strict";

const marketplacePath = "/products/marketplace/";
const canonical = "https://novapharmhealthcare.com" + marketplacePath;

/**
 * Stamp the final, separately generated Marketplace public page after all
 * SEO, commerce and visual transforms have run.
 * This is provenance only: it does not grant checkout or publication rights.
 */
export function stampMarketplaceSourceRevision(html, sha) {
  assert.equal(typeof html, "string", "Final Marketplace HTML is required");
  assert.match(sha, /^[a-f0-9]{40}$/, "Release must have a full Git commit SHA");
  assert.ok(html.includes("<head>") && html.includes("</head>"),
    "Generated Marketplace page must have complete head");
  assert.ok(html.includes('<link rel="canonical" href="' + canonical + '">'),
    "Final Marketplace canonical does not match approved public route");
  const robots = html.match(/<meta\s+name=["']robots["']\s+content=["']([^"']*)["'][^>]*>/i)?.[1] ?? "";
  assert.ok(!/\bnoindex\b/i.test(robots), "Do not claim source provenance for a noindex Marketplace release");
  const cleaned = html.replace(/\s*<meta\s+name=["']novapharm-source-sha["']\s+content=["'][^"']*["']\s*\/?>/gi, "");
  const stamped = cleaned.replace("</head>",
    '  <meta name="novapharm-source-sha" content="' + sha + '">\n</head>');
  assert.equal([...stamped.matchAll(/<meta\s+name=["']novapharm-source-sha["']/gi)].length, 1,
    "Marketplace must contain exactly one source revision");
  return stamped;
}
