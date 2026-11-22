import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(".");
const read = (path) => readFileSync(join(root, path), "utf8");
const json = (path) => JSON.parse(read(path));
const catalogue = json("assets/data/nutraxin-retail-catalogue.json");
const registered = json("docs/nutraxin-product-register.json").products;
const origin = "https://novapharmhealthcare.com";
const storefrontScript = /<script[^>]*type="module"[^>]*src="\/assets\/js\/nutraxin-retail-store\.js(?:\?[^"]*)?"[^>]*><\/script>/g;
const scripts = (html) => [...html.matchAll(/<script\s+type="application\/ld\+json">([^<]+)<\/script>/g)].map(match => JSON.parse(match[1]));
const ready = (product) => catalogue.delivery_verified === true && catalogue.checkout_enabled === true &&
  catalogue.payment_collection_enabled === true && product.ordering_enabled === true && product.available_to_sell === true;

test("homepage publishes one coherent legal corporate identity and verified public social profile", () => {
  const home = read("index.html");
  const companiesHouse = "https://find-and-update.company-information.service.gov.uk/company/16716501";
  const linkedIn = "https://www.linkedin.com/company/novapharm-healthcare/";
  const orgs = scripts(home).filter(s => (Array.isArray(s["@type"]) ? s["@type"] : [s["@type"]]).includes("Organization"));
  assert.equal(orgs.length, 1);
  const org = orgs[0];
  assert.equal(org["@id"], origin + "/#organization");
  assert.equal(org.legalName, "NOVAPHARM HEALTHCARE LTD");
  assert.equal(org.identifier.value, "16716501");
  assert.equal(org.telephone, "+44 7352 036605");
  assert.equal(org.email, "enquiries@novapharmhealthcare.com");
  assert.equal(org.contactPoint.telephone, org.telephone);
  assert.equal(org.contactPoint.email, org.email);
  assert.deepEqual(org.founder.map(person => person.name), ["Vishal Chakravarty", "Prabhakar Vitthal Lahare"]);
  assert.deepEqual(org.member.map(person => person.name), ["Vishal Chakravarty", "Prabhakar Vitthal Lahare", "Dr Girish Shantilal Achliya", "Dr Helly Panchal"]);
  assert.equal(new Set(org.member.map(person => person["@id"])).size, 4, "Each statutory director must have a unique profile identity");
  assert.equal(org.member.filter(person => person.image).length, 3, "Only approved leadership portraits can enter the corporate identity graph");
  assert.equal(org.member.find(person => person.name === "Dr Helly Panchal").image, undefined, "Do not fabricate a portrait for Dr Helly");
  assert(org.founder.every(person => org.member.some(member => member.name === person.name)), "Founders are a documented subset of the directors");
  assert.deepEqual(org.sameAs, [companiesHouse, linkedIn, "https://www.wikidata.org/wiki/Q137660644"]);
  const approvedLogoAsset = ["assets", "brand", "pwa-icon-512.png"].join("/");
  assert.equal(org.logo["@id"], origin + "/#logo");
  assert.equal(org.logo.url, origin + "/" + approvedLogoAsset);
  assert.equal(org.logo.contentUrl, org.logo.url);
  assert.equal(org.logo.width, 512);
  assert.equal(org.logo.height, 512);
  assert(existsSync(join(root, approvedLogoAsset)));
  const logoBytes = readFileSync(join(root, approvedLogoAsset));
  assert.equal(logoBytes.readUInt32BE(16), 512, "Knowledge Panel logo must really be square");
  assert.equal(logoBytes.readUInt32BE(20), 512, "Knowledge Panel logo must really be square");
  const approvedWordmarkAsset = ["assets", "brand", "novapharm-healthcare-logo.png"].join("/");
  assert.equal(org.image.url, origin + "/" + approvedWordmarkAsset);
  assert.equal(org.mainEntityOfPage["@id"], origin + "/#webpage");
  assert(!org.address, "Do not expose a residential registered office address in structured data");
});

test("public company-facts page names the same UK organization and links genuine identity records", () => {
  const html = read("about/company/index.html");
  const page = scripts(html).find(s => s["@type"] === "WebPage");
  assert.equal(page?.mainEntity?.["@id"], origin + "/#organization");
  assert.equal(page?.about?.["@id"], origin + "/#organization");
  assert.equal(page?.url, origin + "/about/company/");
  assert.match(html, /NOVAPHARM HEALTHCARE LTD/);
  assert.match(html, /16716501/);
  assert.match(html, /enquiries@novapharmhealthcare\.com/);
  assert.match(html, /\+44 7352 036605/);
  assert.match(html, /Prabhakar Vitthal Lahare/);
  assert.match(html, /Board of directors/);
  assert.match(html, /Dr Girish Shantilal Achliya/);
  assert.match(html, /Dr Helly Panchal/);
  assert.match(html, /data-company-identity-links/);
  assert(html.includes('href="https://www.linkedin.com/company/novapharm-healthcare/"'), "Exact company LinkedIn href missing");
  assert(html.includes('href="https://www.wikidata.org/wiki/Q137660644"'), "Exact Wikidata href missing");
  assert.equal((html.match(/data-company-identity-links/g) || []).length, 1);
});

test("the actual Next.js corporate website uses the same Knowledge Panel entity as the static source", () => {
  const home = scripts(read("index.html")).find(s =>
    (Array.isArray(s["@type"]) ? s["@type"] : [s["@type"]]).includes("Organization"));
  assert(home, "Canonical Organization schema missing from the static source");
  const seoSource = read("apps/corporate/lib/seo.ts");
  const rendererSource = read("apps/corporate/components/page-renderer.tsx");
  const iconPath = ["assets", "brand", "pwa-icon-512.png"].join("/");

  assert(seoSource.includes("export function organisationSchema()"), "Next.js organization generator missing");
  assert(seoSource.includes("url: `${siteUrl}/" + iconPath + "`"), "Next.js square Google logo does not match canonical homepage");
  assert(seoSource.includes("width: 512") && seoSource.includes("height: 512"), "Next.js company logo must retain 512x512 dimensions");
  assert(seoSource.includes('sameAs: [company.companiesHouseUrl, "https://www.linkedin.com/company/novapharm-healthcare/", "https://www.wikidata.org/wiki/Q137660644"]'), "Next.js company identity must keep the two verified external public references");
  assert(seoSource.includes('page.slug === "about/company" ? { mainEntity: { "@id": organisationId } }'), "Live company WebPage must point to same Organization entity");
  assert(rendererSource.includes("data-company-identity-links"), "Live company page is missing visible corporate identity references");
  assert(rendererSource.includes('href="https://www.linkedin.com/company/novapharm-healthcare/"'), "Live corporate LinkedIn href must be exact");
  assert(rendererSource.includes('href="https://www.wikidata.org/wiki/Q137660644"'), "Live corporate Wikidata href must be exact");
  assert.equal(home.logo.width, 512);
  assert.equal(home.logo.height, 512);
  assert.equal(home.identifier.value, "16716501");
  assert(seoSource.includes("publicEnquiriesEmail") && seoSource.includes("publicTelephone"), "Next.js contact should match company source");
  assert(seoSource.includes('"prabhakar-lahare"'), "Next.js founder graph includes Prabhakar");
  assert(seoSource.includes('"girish-achliya"') && seoSource.includes('"helly-panchal"'), "Next.js board graph must include both scientific directors");
  assert(rendererSource.includes("data-board-directors") && rendererSource.includes("Dr Girish Shantilal Achliya") && rendererSource.includes("Dr Helly Panchal"), "Next.js must visibly link all four directors");
  assert(!read("scripts/build-public-pages.mjs").includes('streetAddress: company.registeredStreet'), "Legacy generator must not republish a residential address in public Organization schema");
  assert(rendererSource.includes("publicEnquiriesEmail") && rendererSource.includes("publicTelephone"), "Visible corporate contact");
  assert(!home.address, "Registered residential address must remain absent from public Organization schema");
});


test("corporate sitemap dates stay aligned with the two published November identity updates", () => {
  const sitemap = read("sitemap.xml");
  for (const pathname of ["/", "/about/company/"]) {
    assert(
      sitemap.includes(`<loc>${origin}${pathname}</loc><lastmod>2026-11-22</lastmod>`),
      `Static sitemap date missing for ${pathname}`,
    );
  }
  const generator = read("scripts/enhance-seo-authority.mjs");
  assert(generator.includes('if (route === "/" || route === "/about/company/") return "2026-11-22";'),
    "The actual public sitemap generator must preserve the two November identity lastmod dates");
  const source = read("apps/corporate/app/sitemap.ts");
  assert(source.includes('const corporateIdentityDate = new Date("2026-11-22T00:00:00Z");'),
    "Next.js sitemap identity modification date must match the approved release");
  assert(source.includes('lastModified: slug === "" || slug === "about/company" ? corporateIdentityDate : contentDate'),
    "The Next.js sitemap must update only the two edited corporate URLs");
});

test("all 19 consumer product pages have a working storefront module and internally consistent Offers", () => {
  assert.equal(registered.length, 19);
  assert.equal(catalogue.products.length, 19);
  const prices = new Map(catalogue.products.map(p => [p.sku, p]));
  for (const p of registered) {
    const retail = prices.get(p.sku);
    assert(retail, "Retail SKU missing: " + p.sku);
    const html = read("products/nutraxin/" + p.slug + "/index.html");
    assert.equal([...html.matchAll(storefrontScript)].length, 1, "Storefront module not loaded once: " + p.slug);
    const products = scripts(html).filter(s => s["@type"] === "Product");
    assert.equal(products.length, 1, "Product schema missing or duplicated: " + p.slug);
    const structured = products[0];
    assert.equal(structured.sku, p.sku);
    assert.equal(structured.brand.name, "Nutraxin");
    assert.equal(structured.offers?.price, (retail.retail_price_pence / 100).toFixed(2));
    assert.equal(structured.offers?.priceCurrency, "GBP");
    assert.equal(structured.offers?.availability,
      "https://schema.org/" + (ready(retail) ? "InStock" : "OutOfStock"));
    assert.equal(structured.offers?.url, origin + "/products/nutraxin/" + p.slug + "/");
    assert(!(structured.additionalProperty || []).some(v => v.name === "Public status" && /not asserted/i.test(v.value)),
      "Contradictory availability signal: " + p.slug);
    assert(html.includes('data-merchant-sku="' + p.sku + '"'), "Visible retail offer missing: " + p.slug);
    assert(html.includes('class="nx-merchant-shop-link" href="/products/nutraxin/"'), "Crawlable shopping link missing: " + p.slug);
    assert(html.includes("Nutraxin food supplements have a separate UK consumer shopping journey."), "Retail/medicine scope must be clear: " + p.slug);
    assert(!html.includes("This website is for corporate and qualified B2B information only."), "Legacy conflicting B2B-only notice: " + p.slug);
  }
});

test("the collection and Bag load retail UI, while the distinct B2B order request does not", () => {
  for (const path of ["products/nutraxin/index.html", "products/nutraxin/bag/index.html"]) {
    assert.equal([...read(path).matchAll(storefrontScript)].length, 1, "Missing retail JS in " + path);
  }
  assert.equal([...read("products/nutraxin/order-request/index.html").matchAll(storefrontScript)].length, 0);
});

test("the 19-row Google Merchant feed stays aligned with the approved consumer catalogue", () => {
  const lines = read("shopping/nutraxin-uk.tsv").trimEnd().split("\n");
  const headers = lines.shift().split("\t");
  const rows = lines.map(line => Object.fromEntries(headers.map((header, i) => [header, line.split("\t")[i]])));
  assert.equal(rows.length, 19);
  const byId = new Map(rows.map(row => [row.id, row]));
  assert.equal(byId.size, 19);
  for (const p of catalogue.products) {
    const row = byId.get(p.sku);
    assert(row, "Merchant feed missing " + p.sku);
    assert.equal(row.price, (p.retail_price_pence / 100).toFixed(2) + " GBP");
    assert.equal(row.availability, ready(p) ? "in_stock" : "out_of_stock");
    assert.equal(row.link, origin + "/products/nutraxin/" + p.slug + "/");
    assert.equal(row["shipping(country:price)"], "GB:" +
      (catalogue.provisional_uk_delivery_charge_pence / 100).toFixed(2) + " GBP");
    assert.equal(row.brand, "Nutraxin");
  }
});
