import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const generator = readFileSync("scripts/apply-esco-catalogue.mjs", "utf8");
const css = readFileSync("assets/css/esco-approved-experience.css", "utf8");
const client = readFileSync("assets/js/esco-catalogue.js", "utf8");
const catalogue = JSON.parse(readFileSync("assets/data/esco-catalogue.json", "utf8"));
const manifest = JSON.parse(readFileSync("assets/data/esco-model-photo-map.json", "utf8"));

test("approved centered art direction preserves a catalogue-backed, descriptive hero", () => {
  assert.match(generator, /Better tools\. Better care\./);
  assert.match(generator, /Every detail matters\./);
  assert.match(generator, /esco-hero-centered/);
  assert.match(generator, /esco-hero-gallery/);
  assert.match(generator, /Discover the collection/);
  assert.match(generator, /Model-associated supplier catalogue photographs/);
  assert.match(generator, /esco-approved-experience\.css/);
  assert.ok(css.includes(".esco-storefront .esco-hero h1"));
  assert.ok(css.includes(".esco-storefront .esco-hero-gallery"));
  assert.ok(css.includes("background:#fff"));
});

test("four showcased devices have model-matched supplier photos, not invented variants", () => {
  const ids = ["ESCO-CAT-0066", "ESCO-CAT-0003", "ESCO-CAT-0048", "ESCO-CAT-0078"];
  const entries = catalogue.categories.flatMap(category => category.entries);
  for (const id of ids) {
    const product = entries.find(entry => entry.id === id);
    assert.ok(product?.model, id + " must have a supplier model");
    assert.equal(manifest.images[id]?.model, product.model);
    assert.match(generator, new RegExp(id));
  }
  assert.equal(catalogue.entriesTotal, 373);
  assert.equal(catalogue.categories.length, 12);
});

test("product journey runs hero, ranges, featured, searchable catalogue and Bag", () => {
  const hero = generator.indexOf('<header class="esco-hero"');
  const categories = generator.indexOf('<section class="esco-categories"');
  const featured = generator.indexOf('<section class="esco-featured"');
  const searchable = generator.indexOf('<section class="esco-catalogue"');
  assert.ok(hero > -1 && hero < categories && categories < featured && featured < searchable);
  for (const marker of ["data-esco-search", "data-esco-category", "data-esco-quote-tray", "data-esco-add", "data-esco-details", "data-esco-product-dialog", "data-esco-top-bag-count"]) {
    assert.ok(generator.includes(marker), marker);
  }
  assert.match(generator, /<a href="\/products\/esco\/bag\/" class="esco-localbar-bag">/);
  assert.match(generator, /data-esco-ready-only disabled/);
});

test("featured links open the correct product and readiness labels are server-specific", () => {
  assert.match(client, /openProductDetails\(jump\.dataset\.escoSpotlightJump\)/);
  assert.match(client, /const spotlightCard = root\.querySelector/);
  assert.match(client, /if \(spotlightLabel\) spotlightLabel\.textContent = "READY TO ORDER"/);
  assert.match(client, /payment_collection_active !== true/);
  assert.match(client, /approved_unit_prices_pence/);
  assert.match(generator, /UK guide/);
  assert.doesNotMatch(client, /checkout\.sessions\.create|cardNumber|sk_live_[A-Za-z0-9]{16,}/);
});

test("responsive, keyboard-accessible storefront is styled without altering checkout", () => {
  assert.match(css, /:focus-visible/); // existing base style is inherited and retained
  assert.match(css, /@media\(max-width:760px\)/);
  assert.match(css, /@media\(max-width:540px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /scroll-snap-type:x/);
  assert.match(generator, /aria-label="ESCO collection navigation"/);
  assert.match(generator, /aria-label="Catalogue at a glance"/);
  assert.match(generator, /aria-label="Model-associated ESCO medical equipment photographs"/);
});

test("customer-first catalogue relies on the header Bag without the oversized homepage tray", () => {
  const refinement = readFileSync("assets/css/esco-customer-first-fixes.css", "utf8");
  assert.match(generator, /data-esco-quote-tray hidden aria-hidden="true"/);
  assert.match(generator, /class="esco-localbar-bag"/);
  assert.doesNotMatch(generator, /class="esco-results-bag"/);
  assert.match(refinement, /\.esco-storefront \.esco-quote-tray\[hidden\]/);
  assert.match(refinement, /\.esco-storefront \.esco-mobile-bag/);
  assert.match(client, /topBagCount\.textContent = String\(state\.size\)/);
  assert.match(client, /clearFilters\.hidden = !\(search \|\| category \|\| readyToggle\?\.checked\)/);
});
test("black-background supplier photograph is cleaned once and reused across product, hero and Bag", () => {
  const photoScript = readFileSync("assets/js/esco-photo-cleanup.js", "utf8");
  assert.match(photoScript, /esco-p07-image03\.webp/);
  assert.match(photoScript, /getImageData/);
  assert.match(photoScript, /MutationObserver/);
  assert.match(photoScript, /neutralDark/);
  assert.match(photoScript, /canvas\.toDataURL\("image\/png"\)/);
  assert.match(generator, /esco-photo-cleanup\.js/);
  assert.match(generator, /esco-customer-first-fixes\.css/);
});
