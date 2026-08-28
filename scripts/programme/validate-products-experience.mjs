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
if (register.products.length !== 19) throw new Error(`Expected 19 governed Nutraxin products; found ${register.products.length}.`);
for (const product of register.products) {
  const productPath = path.join(root, "products", "nutraxin", product.slug, "index.html");
  if (!existsSync(productPath)) throw new Error(`Nutraxin detail route is missing: ${product.slug}.`);
  const detail = readFileSync(productPath, "utf8");
  if (!detail.includes(product.name) || !detail.includes(product.packSize)) throw new Error(`Nutraxin detail route is incomplete: ${product.slug}.`);
  if (/[£€$]\s*\d|add to cart|buy now|checkout/i.test(detail)) throw new Error(`Nutraxin detail route exposes commerce without authority: ${product.slug}.`);
  if (!detail.includes("availability") || !detail.includes("not asserted")) throw new Error(`Nutraxin detail route is missing its availability boundary: ${product.slug}.`);
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
