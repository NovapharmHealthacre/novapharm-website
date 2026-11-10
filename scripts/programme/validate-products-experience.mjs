import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const html = readFileSync(path.join(root, "products/index.html"), "utf8");
const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1];
if (!main) throw new Error("Products page has no main landmark.");

const heading = "Food Supplement Portfolio Review";
const reference = "Nutraxin UK catalogue reference";
const occurrences = main.match(new RegExp(heading, "g"))?.length ?? 0;
if (occurrences !== 1) throw new Error(`Expected one ${heading} heading; found ${occurrences}.`);
if (!main.includes(reference)) throw new Error(`Products page is missing ${reference}.`);

const heroEnd = main.indexOf("</section>");
const firstSectionStart = main.indexOf("<section", heroEnd + 10);
const firstSectionEnd = main.indexOf("</section>", firstSectionStart);
const firstSubstantiveSection = main.slice(firstSectionStart, firstSectionEnd);
if (!firstSubstantiveSection.includes(heading)) {
  throw new Error("Food Supplement Portfolio Review is not the first substantive section after the Products introduction.");
}
if (!/href="\/products\/nutraxin\/"/.test(firstSubstantiveSection)) throw new Error("Nutraxin catalogue action is missing or non-canonical.");
if (!existsSync(path.join(root, "products/nutraxin/index.html"))) throw new Error("Nutraxin catalogue route does not resolve to a generated page.");
if (/[£€$]\s*\d|add to cart|buy now|checkout/i.test(main)) throw new Error("Products page exposes ecommerce or price content.");

const register = JSON.parse(readFileSync(path.join(root, "docs/nutraxin-product-register.json"), "utf8"));
const retailCatalog = JSON.parse(readFileSync(path.join(root, "assets/data/nutraxin-retail-catalogue.json"), "utf8"));
const retailBySku = new Map(retailCatalog.products.map((item) => [item.sku, item]));
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

console.log("Products experience validation passed: one priority Food Supplement Portfolio Review, 19 canonical detail routes, compatibility redirects, and no unauthorised commerce.");
