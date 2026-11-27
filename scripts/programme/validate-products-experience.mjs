import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const html = readFileSync(path.join(root, "products/index.html"), "utf8");
const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1];
if (!main) throw new Error("Products page has no main landmark.");

const heading = "Food Supplement Portfolio Review";
const reference = "Nutraxin UK catalogue reference";
// The approved storefront supersedes the old portfolio-first static page.
// Keep runtime commerce fail-closed: no hard-coded prices or enabled purchase
// buttons in the landing HTML, and every featured identity must be governed.
if (!main.includes('id="np-products-title">Carefully selected.<br>For the everyday.</h1>')) throw new Error("Approved luxury Products heading missing.");
if (!main.includes('id="nps-essentials"') || main.indexOf('id="nps-essentials"') >= main.indexOf('id="np-products-collections"')) throw new Error("Featured products must precede collection discovery.");
const featured = [...main.matchAll(/<article class="nps-product" data-nps-slug="([^"]+)">([\s\S]*?)<\/article>/g)];
if (featured.length !== 4 || new Set(featured.map(m=>m[1])).size !== 4) throw new Error("Expected four distinct featured products.");
for (const [_,slug,card] of featured) {
  if (!card.includes('href="/products/nutraxin/'+slug+'/"') || !card.includes('data-nps-add hidden disabled') || !card.includes('data-nps-price hidden')) throw new Error("Featured product lacks canonical link or fail-closed controls: "+slug);
}
for (const route of ["/products/nutraxin/","/products/health-and-wellbeing/","/products/esco/","/products/strategic-portfolio/","/products/marketplace/","/products/track/"]) {
  if (!main.includes('href="'+route+'"') || !existsSync(path.join(root,route.slice(1),"index.html"))) throw new Error("Missing Products destination: "+route);
}
if (!main.includes("data-nps-quick") || !main.includes("data-nps-bag-items") || !main.includes('href="/products/nutraxin/bag/"') || !html.includes("nutraxin-retail-store.js")) throw new Error("Shared shopping journey missing.");
if (/[£€$]\s*\d|add to cart|buy now/i.test(main)) throw new Error("Products page exposes ungoverned static ecommerce or price content.");

const register = JSON.parse(readFileSync(path.join(root, "docs/nutraxin-product-register.json"), "utf8"));
const retailCatalog = JSON.parse(readFileSync(path.join(root, "assets/data/nutraxin-retail-catalogue.json"), "utf8"));
const retailBySku = new Map(retailCatalog.products.map((item) => [item.sku, item]));
for (const [,slug] of featured) if (!retailCatalog.products.some(item=>item.slug===slug)) throw new Error("Ungoverned featured product: "+slug);
if (register.products.length !== 19) throw new Error(`Expected 19 governed Nutraxin products; found ${register.products.length}.`);
for (const product of register.products) {
  const productPath = path.join(root, "products", "nutraxin", product.slug, "index.html");
  if (!existsSync(productPath)) throw new Error(`Nutraxin detail route is missing: ${product.slug}.`);
  const detail = readFileSync(productPath, "utf8");
  if (!detail.includes(product.name) || !detail.includes(product.packSize)) throw new Error(`Nutraxin detail route is incomplete: ${product.slug}.`);
  const retail = retailBySku.get(product.sku);
  if (!retail || retail.slug !== product.slug) throw new Error(`Approved Nutraxin retail identity is missing: ${product.slug}.`);
  const permitted = retailCatalog.price_authority === "approved_consumer_retail" && retailCatalog.currency === "GBP";
  if (!permitted || !Number.isSafeInteger(retail.retail_price_pence) || retail.retail_price_pence <= 0) {
    throw new Error(`Nutraxin retail price authority is missing: ${product.slug}.`);
  }
  const amount = (retail.retail_price_pence / 100).toFixed(2);
  if (!detail.includes("£" + amount) || !detail.includes('data-merchant-sku="' + product.sku + '"')) {
    throw new Error(`Nutraxin displayed price differs from approved source: ${product.slug}.`);
  }
  const expectedAvailability = retailCatalog.delivery_verified === true &&
    retailCatalog.checkout_enabled === true && retailCatalog.payment_collection_enabled === true &&
    retail.available_to_sell === true && retail.ordering_enabled === true ? "InStock" : "OutOfStock";
  const structuredOffers = [...detail.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)]
    .map((match) => JSON.parse(match[1]))
    .filter((node) => node["@type"] === "Product" && node.sku === product.sku);
  if (structuredOffers.length !== 1) throw new Error(`Missing product markup: ${product.slug}.`);
  const offer = structuredOffers[0].offers;
  if (offer?.priceCurrency !== "GBP" || offer.price !== amount ||
      offer.availability !== "https://schema.org/" + expectedAvailability) {
    throw new Error(`Nutraxin Offer price/availability is inconsistent: ${product.slug}.`);
  }
  if (expectedAvailability === "OutOfStock" && !detail.includes("Currently unavailable to order online")) {
    throw new Error(`Unavailable Nutraxin product lacks a clear availability warning: ${product.slug}.`);
  }
  if (/add to cart|buy now/i.test(detail) && expectedAvailability !== "InStock") {
    throw new Error(`Unapproved public purchase action: ${product.slug}.`);
  }
}

for (const [legacy, canonical] of [["product-portfolio/index.html", "/products/"], ["product-portfolio/nutraxin/index.html", "/products/nutraxin/"]]) {
  const redirect = readFileSync(path.join(root, legacy), "utf8");
  if (!redirect.includes('name="robots" content="noindex, follow"') || !redirect.includes(`href="https://novapharmhealthcare.com${canonical}"`)) {
    throw new Error(`Legacy product route does not fail closed to ${canonical}.`);
  }
}

const productsComponent = readFileSync(path.join(root, "apps/corporate/components/concise-specialist-pages.tsx"), "utf8").match(/export function ConciseProductsPage\(\) \{([\s\S]*?)\n\}/)?.[1] ?? "";
if (!productsComponent.includes('id="food-supplement-portfolio-review"')) throw new Error("Corporate application Products view is missing the priority portfolio section.");
if (!productsComponent.includes(heading) || !productsComponent.includes(reference)) throw new Error("Corporate application Products view has inconsistent approved wording.");
const pageHeroIndex = productsComponent.indexOf("<PageHero");
const firstSectionIndex = productsComponent.indexOf("<section", pageHeroIndex);
const priorityIndex = productsComponent.indexOf('id="food-supplement-portfolio-review"');
if (priorityIndex < firstSectionIndex || priorityIndex > productsComponent.indexOf("</section>", firstSectionIndex)) {
  throw new Error("Corporate application priority portfolio section is not first after PageHero.");
}
if (!productsComponent.includes('href="/products/nutraxin/"')) throw new Error("Corporate application uses a legacy Nutraxin route.");

console.log("Products experience validation passed: approved luxury storefront, four governed featured products, 19 canonical detail routes, compatibility redirects, and fail-closed commerce.");
