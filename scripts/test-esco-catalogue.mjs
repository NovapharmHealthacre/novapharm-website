import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const data=JSON.parse(readFileSync("assets/data/esco-catalogue.json","utf8"));
const entries=data.categories.flatMap(x=>x.entries);
test("source index has exactly 373 distinct ESCO references across 12 supplier categories",()=>{
 assert.equal(data.entriesTotal,373);
 assert.equal(data.categories.length,12);
 assert.equal(entries.length,373);
 assert.equal(new Set(entries.map(x=>x.id)).size,373);
 assert.ok(entries.every(x=>x.id.startsWith("ESCO-CAT-") && x.name && x.subcategory && Number.isInteger(x.sourceIndexPage)));
 assert.equal(entries.filter(x=>Boolean(x.model)).length,73);
});
test("unverified ESCO items are quote-only and never charged in Nutraxin checkout",()=>{
 assert.equal(data.checkoutEnabled,false);
 assert.equal(data.requestQuoteOnly,true);
 assert.ok(entries.every(x=>x.sellable===false && x.priceGbp===null));
});
test("category imagery identifies authentic illustrative sources, not verified one-to-one product images",()=>{
 assert.ok(data.categories.every(x=>x.representativeImage.startsWith("esco-") && x.representativeImage.endsWith(".webp") && x.illustrationOnly === true));
 assert.ok(entries.every(x=>x.photoVerified===false));
});

test("ESCO has a 12-item quotation list with contact-form prefill but no payment capture",()=>{
  const builder=readFileSync("scripts/apply-esco-catalogue.mjs","utf8");
  const interaction=readFileSync("assets/js/esco-catalogue.js","utf8");
  const contact=readFileSync("assets/js/novapharm.js","utf8");
  const productionContact=readFileSync("assets/js/contact-production.js","utf8");
  const fallback=readFileSync("assets/js/contact-email-draft.js","utf8");
  assert.match(builder,/data-esco-add/);
  assert.match(builder,/data-esco-quote-items/);
  assert.match(builder,/Request a quotation/);
  assert.match(interaction,/const MAX_ITEMS = 12/);
  assert.match(interaction,/quote=/);
  assert.match(contact,/quoteMessage.*startsWith/);
  assert.match(productionContact,/rawEscoQuote/);
  assert.match(productionContact,/items.length <= 12/);
  assert.match(fallback,/quoteMessage.*startsWith/);
  assert.doesNotMatch(builder,/payment_collection_enabled|buy now|checkoutEnabled: true/);
});

test("all indexed product cards display transparently labelled supplier category imagery",()=>{
  const builder=readFileSync("scripts/apply-esco-catalogue.mjs","utf8");
  const css=readFileSync("assets/css/esco-catalogue.css","utf8");
  assert.match(builder,/class="esco-product-art"/);
  assert.match(builder,/category\.representativeImage/);
  assert.match(builder,/not a verified individual product photograph/);
  assert.match(builder,/exact variant to be confirmed/);
  assert.match(css,/:is\(\.esco-category-image,\.esco-product-art\)\[data-esco-photo/);
  assert.equal((css.match(/:is\(\.esco-category-image,\.esco-product-art\)\[data-esco-photo=/g)||[]).length,12);
});

test("61 ESCO model-matched photos exist as distinct catalogue-derived WebP assets",()=>{
  const fs=readFileSync;
  const images=JSON.parse(fs("assets/data/esco-model-photo-map.json","utf8"));
  assert.equal(images.mappedImagesCount,61);
  assert.equal(Object.keys(images.images).length,61);
  const byId=new Map(entries.map(e=>[e.id,e]));
  for (const [id,img] of Object.entries(images.images)) {
    assert.equal(img.model,byId.get(id)?.model);
    assert.equal(img.variantConfirmed,false);
    assert.equal(img.rightsConfirmed,false);
    assert.match(img.path,/^[/]assets[/]media[/]esco[/]esco-p[0-9]{2}-image[0-9]{2}[.]webp$/);
    assert.ok(fs("." + img.path).length>200,"Missing source image: "+img.path);
  }
  const generator=fs("scripts/apply-esco-catalogue.mjs","utf8");
  assert.match(generator,/productPicture\(p, category\)/);
  assert.match(generator,/Model-matched ESCO catalogue photo/);
  assert.match(generator,/Supplier category image/);
});
