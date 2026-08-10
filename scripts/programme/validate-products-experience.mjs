import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const html = readFileSync(path.join(root, "product-portfolio/index.html"), "utf8");
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
if (!/href="\/product-portfolio\/nutraxin\/"/.test(firstSubstantiveSection)) throw new Error("Nutraxin catalogue action is missing or non-canonical.");
if (!existsSync(path.join(root, "product-portfolio/nutraxin/index.html"))) throw new Error("Nutraxin catalogue route does not resolve to a generated page.");
if (/[£€$]\s*\d|add to cart|buy now|checkout/i.test(main)) throw new Error("Products page exposes ecommerce or price content.");

const nextSource = readFileSync(path.join(root, "apps/corporate/components/page-renderer.tsx"), "utf8");
const productsComponent = nextSource.match(/function ProductsPage\(\) \{([\s\S]*?)\n\}/)?.[1] ?? "";
if (!productsComponent.includes('id="food-supplement-portfolio-review"')) throw new Error("Corporate application Products view is missing the priority portfolio section.");
if (!productsComponent.includes(heading) || !productsComponent.includes(reference)) throw new Error("Corporate application Products view has inconsistent approved wording.");
const pageHeroIndex = productsComponent.indexOf("<PageHero");
const firstSectionIndex = productsComponent.indexOf("<section", pageHeroIndex);
const priorityIndex = productsComponent.indexOf('id="food-supplement-portfolio-review"');
if (priorityIndex < firstSectionIndex || priorityIndex > productsComponent.indexOf("</section>", firstSectionIndex)) {
  throw new Error("Corporate application priority portfolio section is not first after PageHero.");
}

console.log("Products experience validation passed: one priority Food Supplement Portfolio Review, canonical catalogue route, and no ecommerce pricing.");
