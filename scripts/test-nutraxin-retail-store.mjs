import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { safeBasket, catalogueIsSafe, publicPrice, basketSubtotal, MAX_PER_SKU } from "../assets/js/nutraxin-retail-store.js";

const catalogue=JSON.parse(readFileSync("assets/data/nutraxin-retail-catalogue.json","utf8"));
const canonical=JSON.parse(readFileSync("apps/corporate/data/nutraxin-product-register.json","utf8"));

test("public Nutraxin retail catalogue matches all governed 19 SKUs and canonical slug/pack",()=>{
 assert.equal(catalogue.products.length,19);
 assert.equal(new Set(catalogue.products.map(x=>x.sku)).size,19);
 assert.ok(catalogueIsSafe(catalogue));
 for(const item of canonical.products){
  const publicEntry=catalogue.products.find(p=>p.sku===item.sku);
  assert.ok(publicEntry,item.sku);
  assert.equal(publicEntry.slug,item.slug);
  assert.equal(publicEntry.pack,item.packSize);
  assert.equal(publicEntry.name,item.name);
  assert.equal(publicEntry.retail_price_pence,null);
  assert.equal(publicEntry.available_to_sell,false);
 }
 assert.equal(catalogue.checkout_enabled,false);
 assert.equal(catalogue.payment_collection_enabled,false);
 assert.equal(catalogue.price_authority,"not_yet_verified_for_consumer_sale");
});
test("tampered, repeated and out-of-range Bag entries are ignored",()=>{
 const sku=catalogue.products[0].sku;
 assert.deepEqual(safeBasket([{sku,quantity:1},{sku,quantity:3},{sku:"NOT_REAL",quantity:1},{sku,quantity:999},{sku:catalogue.products[1].sku,quantity:2}],catalogue.products),[{sku,quantity:1},{sku:catalogue.products[1].sku,quantity:2}]);
 assert.deepEqual(safeBasket([{sku,quantity:"2"},{sku,quantity:0},{sku,quantity:1.2}],catalogue.products),[]);
 assert.deepEqual(safeBasket(null,catalogue.products),[]);
 assert.equal(MAX_PER_SKU,99);
});
test("a price cannot display without an independently approved consumer retail authority",()=>{
 const item=catalogue.products[0];
 assert.equal(publicPrice(item,catalogue),null);
 assert.equal(publicPrice({...item,retail_price_pence:999},catalogue),null);
 const approved={...catalogue,price_authority:"approved_consumer_retail"};
 assert.equal(publicPrice({...item,retail_price_pence:999},approved),999);
 assert.equal(publicPrice({...item,retail_price_pence:-2},approved),null);
 assert.equal(publicPrice({...item,retail_price_pence:2.5},approved),null);
 assert.equal(basketSubtotal([{sku:item.sku,quantity:1}],catalogue),null);
});
test("when approved, the Bag subtotal is correctly calculated in integer pence",()=>{
 const products=catalogue.products.map((p,i)=>({...p,retail_price_pence:i===0?1234:i===1?2299:null}));
 const approved={...catalogue,price_authority:"approved_consumer_retail",products};
 assert.equal(basketSubtotal([{sku:products[0].sku,quantity:2},{sku:products[1].sku,quantity:1}],approved),4767);
 assert.equal(basketSubtotal([{sku:products[2].sku,quantity:1}],approved),null);
 assert.equal(basketSubtotal([{sku:"NOT_REAL",quantity:1}],approved),null);
});
test("the review page has no payment-ready claim before authorisation",()=>{
 const html=readFileSync("products/nutraxin/bag/index.html","utf8");
 assert.match(html,/data-nx-public-bag/);
 assert.match(html,/data-nx-checkout disabled/);
 assert.match(html,/No payment will be taken/);
 assert.doesNotMatch(html,/\bsk_live_|\bwhsec_/);
});
