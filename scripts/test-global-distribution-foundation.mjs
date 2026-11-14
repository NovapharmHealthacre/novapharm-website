import { readFileSync, statSync } from "node:fs";
import { strict as assert } from "node:assert";
import { runInNewContext } from "node:vm";
import { navigation } from "../src/content/site-content.mjs";

const routes = ["distribution", "market-access", "markets"];
const artDirection = JSON.parse(readFileSync("config/module-art-direction.json", "utf8"));
const earthApproval = artDirection.assets.find((asset) => asset.id === "home-earth-horizon");
assert.deepEqual(earthApproval?.allowedRoutes, ["/"],
  "Owner-approved Earth image must remain on Home only; Distribution uses the real warehouse");
assert.equal(earthApproval?.maxReuse, 1, "Earth must not be reused on the Distribution hero");

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
  if (slug === "markets") {
    assert.match(html, /data-markets-design="apple-photographic-approved-20261111"/);
    assert.match(html, /Medicine<br>moves globally\.<br>Access is local\./);
    assert.match(html, /Five regions\. Five different pathways\./);
    assert.match(html, /Local permissions\.<br>Shared standards\./);
    assert.match(html, /Where should medicine go next\?/);
    assert.match(html, /href="\/assets\/css\/markets-editorial\.css\?v=20261111-nasa-hd-1"/);
    assert.match(html, /https:\/\/assets\.science\.nasa\.gov\/content\/dam\/science\/esd\/eo\/images\/imagerecords\/152000\/152693\/iss070e075895_lrg\.jpg/);
    assert.match(html, /width="5568" height="3712" fetchpriority="high"/);
    assert.match(html, /NASA Expedition 70 crew/);
    for (const region of ["United Kingdom", "European Union", "United States", "Canada", "Middle East &amp; North Africa"]) {
      assert.ok(html.includes(region), "Markets regional photograph or description missing: " + region);
    }
    assert.equal((html.match(/<article class="markets-card /g) || []).length, 5, "Markets must present five regional photo cards.");
    assert.doesNotMatch(html.match(/<main id="main" class="markets-editorial"[\s\S]*?<\/main>/i)?.[0] || "", /<svg\b|heroicon|lucide/i, "Markets page must not add decorative icons or SVG illustrations.");
    assert.match(html, /UK permissions do not confer distribution rights in other countries/);
  }
  if (slug === "distribution") {
    // The public page must contain the approved actual media, not solely a
    // mockup, stock photo, unsupported carrier logo or copy-only proposal.
    assert.match(html, /data-distribution-design="20261111-real-warehouse"/);
    assert.ok(html.includes('class="ndist-brand-logo" src="/assets/brand/novapharm-distribution-logo.svg"'), "Distribution hero must use the official logo asset");
    assert.match(html, /alt="NovaPharm Distribution"/, "Official logo requires descriptive alt text");
    assert.ok(statSync("assets/brand/novapharm-distribution-logo.svg").size > 4000, "Official logo asset must be present and nonempty");
    assert.match(html, /<h1 id="ndist-title">Global distribution<br>for modern healthcare\.<\/h1>/);
    assert.match(html, /class="ndist-hero-warehouse" src="\/assets\/media\/about\/novapharm-warehouse-original\.jpg"/);
    assert.doesNotMatch(html, /class="ndist-hero-earth"|<img[^>]+src="\/assets\/media\/home\/earth-reference-1400\.jpg"/);
    assert.match(html, /src="\/assets\/media\/insights\/compliance-first-distribution-960\.jpg"/);
    assert.ok(html.indexOf("ndist-facility") < html.indexOf("ndist-network-hero"), "Warehouse capabilities must appear before global network");
    assert.match(html, /2–8°C \/ controlled ambient/);
    assert.match(html, /Not claimed to show this warehouse’s refrigerated room/);
    assert.match(html, /src="\/assets\/media\/home\/supply-network-hero-1200\.jpg"/);
    assert.match(html, /<figure class="ndist-facility-media">/);
    assert.match(html, /<section class="npd-section ndist-partners"/);
    assert.match(html, /UPS Healthcare/);
    assert.match(html, /Marken UK incorporates the former Polar Speed operation/);
    assert.match(html, /their official logos and proprietary photographs are not reproduced/i);
    assert.match(html, /do not represent NovaPharm-owned/i);
    assert.match(html, /<section class="npd-section ndist-pathway"/);
    assert.match(html, /<section class="npd-section npd-final ndist-final"/);
    for (const actualMedia of [
      "assets/media/about/novapharm-warehouse-original.jpg",
      "assets/media/insights/compliance-first-distribution-960.jpg",
      "assets/media/home/supply-network-hero-1200.jpg"
    ]) {
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
for (const script of ["assets/js/contact-production.js", "assets/js/contact-email-draft.js"]) {
  const source = readFileSync(script, "utf8");
  for (const [search, expected] of [
    ["?enquiry=Distribution", "Distribution partnership"],
    ["?enquiry=Distribution%20partnership", "Distribution partnership"],
    ["?enquiry=Oncology", "Oncology & specialist medicines"],
    ["?enquiry=Oncology%20solid%20tumours", "Oncology & specialist medicines"],
    ["?enquiry=Pharmacy%20or%20wholesaler%20account", "Pharmacy or wholesaler account"]
  ]) {
    class Select {
      constructor() {
        this.options = [
          { value: "Product opportunity" },
          { value: "Distribution partnership" },
          { value: "Oncology & specialist medicines" },
          { value: "Pharmacy or wholesaler account" },
          { value: "General enquiry" }
        ];
        this.value = "";
      }
    }
    class TextArea { constructor() { this.value = ""; } }
    class Form {}
    const select = new Select();
    const message = new TextArea();
    const form = new Form();
    form.dataset = { apiOrigin: "https://h4dc1e4u57.execute-api.eu-north-1.amazonaws.com" };
    form.elements = { namedItem: (name) => name === "enquiryType" ? select : name === "message" ? message : null };
    form.querySelector = () => ({ disabled: false });
    form.addEventListener = () => {};
    const isLive = script.includes("contact-production");
    const document = { querySelector: (selector) => {
      if (selector === (isLive ? "[data-live-b2b-enquiry-form]" : "[data-email-enquiry-form]")) return form;
      return { textContent: "" };
    }};
    runInNewContext(source, {
      document, URLSearchParams, HTMLFormElement: Form,
      HTMLSelectElement: Select, HTMLTextAreaElement: TextArea,
      location: { search }, window: { location: { search } }
    }, { timeout: 1000 });
    assert.equal(select.value, expected, script + " must preselect " + expected + " for " + search);
  }
}

console.log("Global distribution foundation: pages, internal links, canonicals, schema, sitemap, regulatory boundaries and canonical enquiry prefills passed.");
