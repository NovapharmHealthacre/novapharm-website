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
