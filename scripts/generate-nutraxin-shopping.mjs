import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Same approved retail source drives prices, merchant availability and landing-page Offer markup.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const site = "https://novapharmhealthcare.com";
const check = process.argv.includes("--check");
const retail = JSON.parse(readFileSync(join(root, "assets/data/nutraxin-retail-catalogue.json"), "utf8"));
const registered = JSON.parse(readFileSync(join(root, "docs/nutraxin-product-register.json"), "utf8"));
assert.equal(retail.currency, "GBP");
assert.equal(retail.price_authority, "approved_consumer_retail");
assert.equal(registered.products.length, 19);
assert.equal(retail.products.length, 19);
assert.equal(typeof retail.delivery_verified, "boolean");
const indexed = new Map(retail.products.map(p => [p.sku, p]));
assert.equal(indexed.size, 19);
const money = n => {
  assert(Number.isSafeInteger(n) && n > 0, "Invalid approved retail price");
  return (n / 100).toFixed(2);
};
const ready = p => retail.delivery_verified === true &&
  retail.checkout_enabled === true && retail.payment_collection_enabled === true &&
  p.ordering_enabled === true && p.available_to_sell === true;
const clean = s => String(s).replace(/[\t\r\n]+/g, " ").trim();
const catalogDescription = (p, ref) => {
  const ingredients = ref.formulation.map(item => clean(item.name)).filter(Boolean);
  assert(ingredients.length, "No documented ingredients for " + p.sku);
  return p.name + ", " + p.pack + ". Food supplement. Supplier catalogue lists: " +
    ingredients.join(", ") + ". See the product label for full ingredients and directions.";
};
const shortDescription = (p, ref) => {
  const first = clean(ref.formulation[0].name);
  let text = p.name + " (" + p.pack + "). Food supplement featuring " + first +
    ". UK price £" + money(p.retail_price_pence) + " at NovaPharm.";
  if (text.length > 158) text = p.name + " (" + p.pack + "). Food supplement. UK price £" +
    money(p.retail_price_pence) + " at NovaPharm.";
  assert(text.length <= 160, "Metadata too long for " + p.sku);
  return text;
};
// Search titles should keep the verified product identity and pack information
// without repeating the Nutraxin brand. Never truncate a product name mid-word.
const searchTitle = p => [
  p.name + " " + p.pack + " | NovaPharm UK",
  p.name + " " + p.pack + " | UK",
  p.name + " | NovaPharm UK",
  p.name + " | UK",
  p.name
].find(title => title.length <= 60);

const breadcrumbMarkup = (p, url) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Products", item: site + "/products/" },
    { "@type": "ListItem", position: 2, name: "Nutraxin", item: site + "/products/nutraxin/" },
    { "@type": "ListItem", position: 3, name: p.name, item: url }
  ]
});
const relatedProductsMarkup = (p, ref) => {
  const related = registered.products.filter(other =>
    other.range === ref.range && other.sku !== p.sku).slice(0, 3);
  assert(related.length > 0, "No same-range discovery links for " + p.sku);
  const links = related.map(other =>
    '<li><a href="/products/nutraxin/' + other.slug + '/">' +
    htmlAttribute(other.name + " — " + other.packSize) + '</a></li>').join("");
  return '<section class="npd-section npd-nutraxin-related" data-nutraxin-related="true" ' +
    'aria-label="Related Nutraxin products"><div class="container">' +
    '<h2>Explore more Nutraxin ' + htmlAttribute(ref.range) + ' products</h2>' +
    '<ul>' + links + '</ul></div></section>';
};
// Preserve verified brand, exact formulation name and sellable pack in the feed.
const feedTitle = (p) => {
  const packFirstWord = p.pack.replace(/^\\d+\\s+/, "").split(" ")[0].toLowerCase();
  const repeatedEnding = " " + packFirstWord;
  const name = p.name.toLowerCase().endsWith(repeatedEnding)
    ? p.name.slice(0, -repeatedEnding.length) : p.name;
  return name + " " + p.pack;
};
const htmlAttribute = value => String(value).replace(/&/g, "&amp;")
  .replace(/"/g, "&quot;").replace(/</g, "&lt;");
const header = ["id","title","description","link","image_link","availability","price","condition","brand","product_type","shipping(country:price)"];
const lines = [header.join("\t")];
let saleReady = 0;

for (const product of registered.products) {
  const p = indexed.get(product.sku);
  assert(p && p.slug === product.slug && p.name === product.name && p.pack === product.packSize,
    "Identity mismatch: " + product.sku);
  const url = site + "/products/nutraxin/" + product.slug + "/";
  const image = site + "/assets/media/products/nutraxin/" + product.imageBase + ".png";
  assert(existsSync(join(root, "assets/media/products/nutraxin", product.imageBase + ".png")));
  const inStock = ready(p);
  const description = catalogDescription(p, product);
  const metaDescription = shortDescription(p, product);
  const title = searchTitle(p);
  assert(title && title.length <= 60, "Search title is too long for " + p.sku);
  if (inStock) saleReady++;
  const availability = inStock ? "in_stock" : "out_of_stock";
  assert(Number.isSafeInteger(retail.provisional_uk_delivery_charge_pence) && retail.provisional_uk_delivery_charge_pence >= 0,
    "Merchant feed requires the approved UK shipping charge");
  const ship = "GB:" + (retail.provisional_uk_delivery_charge_pence / 100).toFixed(2) + " GBP";
  lines.push([
    p.sku, feedTitle(p),
    description,
    url, image, availability, money(p.retail_price_pence) + " GBP",
    "new", "Nutraxin", "Food Supplements > " + product.range, ship
  ].map(clean).join("\t"));

  const path = join(root, "products/nutraxin", p.slug, "index.html");
  const original = readFileSync(path, "utf8");
  let schemaCount = 0;
  let html = original.replace(/<script type="application\/ld\+json">([^<]+)<\/script>/g, (tag, content) => {
    const json = JSON.parse(content);
    if (json["@type"] === "WebPage") {
      json.description = metaDescription;
      json.name = title;
      json.mainEntity = { "@id": url + "#product" };
      json.dateModified = "2026-11-20";
      return '<script type="application/ld+json">' + JSON.stringify(json) + "</script>";
    }
    if (json["@type"] !== "Product") return tag;
    assert.equal(json.sku, p.sku);
    schemaCount++;
    json.description = description;
    json.offers = {
      "@type": "Offer", url, priceCurrency: "GBP",
      price: money(p.retail_price_pence),
      availability: "https://schema.org/" + (inStock ? "InStock" : "OutOfStock"),
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: "NovaPharm Healthcare Ltd",
        url: site, logo: site + "/assets/brand/novapharm-healthcare-logo.png" },
      // UK shipping terms come from the same owner-approved retail source as the feed.
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount", currency: "GBP",
          value: (retail.provisional_uk_delivery_charge_pence / 100).toFixed(2)
        },
        shippingDestination: { "@type": "DefinedRegion", addressCountry: "GB" }
      }
    };
    return '<script type="application/ld+json">' + JSON.stringify(json) + "</script>";
  });
  assert.equal(schemaCount, 1, "Missing Product schema " + p.slug);
  html = html.replace(/<title>[^<]*<\/title>/,
    "<title>" + htmlAttribute(title) + "</title>");
  html = html.replace(/(<meta property="og:title" content=")[^"]*(">)/,
    (_, before, after) => before + htmlAttribute(title) + after);
  html = html.replace(/(<meta name="twitter:title" content=")[^"]*(">)/,
    (_, before, after) => before + htmlAttribute(title) + after);
  html = html.replace(/(<meta name="description" content=")[^"]*(">)/,
    (_, before, after) => before + htmlAttribute(metaDescription) + after);
  html = html.replace(/(<meta property="og:description" content=")[^"]*(">)/,
    (_, before, after) => before + htmlAttribute(metaDescription) + after);
  const offer = '<div class="nx-merchant-offer" data-merchant-sku="' + p.sku + '">' +
    '<p class="nx-merchant-price">£' + money(p.retail_price_pence) +
    ' <small>including UK VAT</small></p><p class="nx-merchant-availability">' +
    (inStock ? "Available to order online in the UK." :
      "Currently unavailable to order online. Contact us for availability.") + '</p></div>';
  if (html.includes('class="nx-merchant-offer"')) {
    html = html.replace(/<div class="nx-merchant-offer"[^>]*>[\s\S]*?<\/p><\/div>/, offer);
  } else {
    assert(html.includes('class="npd-product-pack"'));
    html = html.replace(/(<p class="npd-product-pack">[^<]+<\/p>)/, "$1" + offer);
  }
  if (!html.includes('"@type":"BreadcrumbList"')) {
    html = html.replace("</head>",
      '<script type="application/ld+json">' +
      JSON.stringify(breadcrumbMarkup(p, url)) + "</script>\n</head>");
  }
  if (!html.includes('data-nutraxin-related="true"')) {
    assert(html.includes("</main>"), "Missing product main content: " + p.sku);
    html = html.replace("</main>", relatedProductsMarkup(p, product) + "</main>");
  }
  if (!html.includes('/assets/css/nutraxin-merchant.css')) {
    html = html.replace("</head>", '<link rel="stylesheet" href="/assets/css/nutraxin-merchant.css">\n</head>');
  }
  html = html.replaceAll(
    "This page does not assert current UK availability, price, stock, a permitted health claim, regulatory acceptance or medicinal status.",
    "The price shown is the approved UK consumer price. Online ordering availability follows the retailer sale-readiness controls; product claims and regulatory status require separate verification."
  );
  html = html.replaceAll(
    "availability and regulatory status are not asserted.",
    "the UK consumer price and ordering status are displayed; regulatory approval is not implied."
  );
  if (check) assert.equal(original, html, "Regenerate " + p.slug);
  else writeFileSync(path, html, "utf8");
}
const output = lines.join("\n") + "\n";
const feed = join(root, "shopping/nutraxin-uk.tsv");
if (check) assert.equal(readFileSync(feed, "utf8"), output, "Feed is stale");
else {
  mkdirSync(dirname(feed), { recursive: true });
  writeFileSync(feed, output, "utf8");
}
console.log("Nutraxin Google Merchant feed: 19 products, " + saleReady + " eligible as in-stock; " + (check ? "verified" : "generated") + ".");
