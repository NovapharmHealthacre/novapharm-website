import { readFileSync } from "node:fs";
import { strict as assert } from "node:assert";
import { navigation } from "../src/content/site-content.mjs";

const routes = ["distribution", "market-access", "markets"];
const sitemap = readFileSync("sitemap.xml", "utf8");
const homepage = readFileSync("index.html", "utf8");
// The visible desktop and mobile navigation in both corporate renderers must
// expose Distribution. A section CTA alone does not satisfy primary navigation.
const nav = homepage.match(/<nav\b[^>]*aria-label="Primary navigation"[\s\S]*?<\/nav>/i)?.[0] || "";
assert.equal(navigation.filter(([label, href]) => label === "Distribution" && href === "/distribution/").length, 1, "Public navigation must have one Distribution entry");
assert.match(readFileSync("apps/corporate/data/site.ts", "utf8"), /\["Distribution", "\/distribution\/"\]/, "Next.js navigation must include Distribution");
assert.match(nav, /<a\b[^>]*href="\/distribution\/"/, "Homepage primary navigation must link to Distribution");
assert.match(nav, /data-mega-trigger="distribution"/, "Distribution navigation must open a contextual menu");
assert.match(homepage, /data-mega-panel="distribution"/, "Distribution menu must include its accessible panel");
assert.match(homepage, /id="commercial-pathways"/, "Homepage must expose commercial pathways");
for (const slug of routes) {
  const path = "/" + slug + "/";
  const html = readFileSync(slug + "/index.html", "utf8");
  assert.equal((html.match(/<h1\b/g) || []).length, 1, slug + " must have one H1");
  assert.ok(html.includes('rel="canonical" href="https://novapharmhealthcare.com' + path + '"'), slug + " missing canonical");
  assert.ok(html.includes("#organization") && html.includes("#website"), slug + " missing canonical entities");
  assert.ok(html.includes("Regulated pharmaceutical wholesale supply has not commenced"), slug + " missing current permissions boundary");
  assert.ok(html.includes("/contact/?enquiry="), slug + " missing qualified enquiry route");
  if (slug === "distribution") {
    // The public page must contain the approved actual media, not solely a
    // mockup, stock photo, unsupported carrier logo or copy-only proposal.
    assert.match(html, /data-distribution-design="20261110-premium"/);
    assert.match(html, /<h1 id="ndist-title">Across borders\.<br>Within standards\.<\/h1>/);
    assert.match(html, /src="\/assets\/media\/home\/earth-reference-1400\.jpg"/);
    assert.match(html, /src="\/assets\/media\/about\/novapharm-warehouse-original\.jpg"/);
    assert.match(html, /src="\/assets\/media\/home\/supply-network-hero-1200\.jpg"/);
    assert.match(html, /<figure class="ndist-facility-media">/);
    assert.match(html, /<section class="npd-section ndist-partners"/);
    assert.match(html, /UPS Healthcare/);
    assert.match(html, /Marken UK incorporates the former Polar Speed operation/);
    assert.match(html, /their official logos and proprietary photographs are not reproduced/i);
    assert.match(html, /No representation of NovaPharm-owned/i);
    assert.match(html, /<section class="npd-section ndist-pathway"/);
    assert.match(html, /<section class="npd-section npd-final ndist-final"/);
    for (const actualMedia of [
      "assets/media/home/earth-reference-1400.jpg",
      "assets/media/about/novapharm-warehouse-original.jpg",
      "assets/media/about/novapharm-warehouse.avif",
      "assets/media/home/supply-network-hero-1200.jpg"
    ]) {
      const { statSync } = await import("node:fs");
      assert.ok(statSync(actualMedia).size > 4000, "Required distribution asset is missing or empty: " + actualMedia);
    }
    assert.doesNotMatch(html, /<img[^>]+(?:ups|marken|polar-speed)[^>]*>/i, "Third-party branded photos and logos require licensed use");
    assert.doesNotMatch(html, /we own the warehouse|we operate UPS|fully licensed global distributor|guaranteed worldwide delivery/i);
    for (const destination of ["/regulatory-services/", "/oncology/", "/products/"]) {
      assert.ok(html.includes('href="' + destination + '"'),
        "Distribution category editorial link must be valid: " + destination);
    }
  }
  assert.ok(sitemap.includes("<loc>https://novapharmhealthcare.com" + path + "</loc>"), slug + " absent from sitemap");
  assert.ok(homepage.includes('href="' + path + '"'), slug + " absent from homepage");
  assert.doesNotMatch(html, /fully licensed worldwide|ISO certified|guaranteed distribution/i, slug + " contains unverified claims");
}
console.log("Global distribution foundation: pages, internal links, canonicals, schema, sitemap, regulatory boundaries and enquiries passed.");
