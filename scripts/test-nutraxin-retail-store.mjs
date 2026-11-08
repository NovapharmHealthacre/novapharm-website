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
  assert.ok(Number.isSafeInteger(publicEntry.retail_price_pence) && publicEntry.retail_price_pence > 0);
  assert.equal(publicEntry.available_to_sell,false);
 }
 assert.equal(catalogue.checkout_enabled,false);
 assert.equal(catalogue.payment_collection_enabled,false);
 assert.equal(catalogue.price_authority,"owner_authorized_provisional_public_display");
 assert.equal(catalogue.price_includes_estimated_uk_vat,true);
 assert.equal(catalogue.vat_estimate_rate_percent,20);
 assert.equal(catalogue.delivery_verified,false);
 assert.equal(catalogue.provisional_uk_delivery_charge_pence,0);
 assert.equal(catalogue.provisional_uk_delivery_cost_seller_funded,true);
 assert.match(catalogue.source_record,/_v5$/);
});
test("public guide prices match all 19 owner-approved 48-tier references plus rounded 20% estimated UK VAT",()=>{
 const expected={
 "NUT-UK-VD3-T120": 1547,
 "NUT-UK-VD3-S30": 1547,
 "NUT-UK-VD3K2-T120": 1838,
 "NUT-UK-VD3K2-S30": 1838,
 "NUT-UK-VC1000-T30": 1547,
 "NUT-UK-VC500-C30": 1838,
 "NUT-UK-VMAX-T60": 1838,
 "NUT-UK-VMAX-E15": 1936,
 "NUT-UK-MGCX-T60": 1838,
 "NUT-UK-MGDL-T60": 1838,
 "NUT-UK-MVE-T60": 2032,
 "NUT-UK-MVW-T60": 2226,
 "NUT-UK-MVM-T60": 2226,
 "NUT-UK-CG-T30": 1936,
 "NUT-UK-CG-S30": 3542,
 "NUT-UK-CCX-T90": 2808,
 "NUT-UK-ART-T90": 2323,
 "NUT-UK-LCAR-T60": 1644,
 "NUT-UK-B12-SL60": 1547
};
 assert.equal(Object.keys(expected).length,19);
 for(const item of catalogue.products){
  assert.equal(item.retail_price_pence,expected[item.sku],item.sku);
 }
 assert.equal(catalogue.price_display_status,"indicative_not_binding");
 assert.equal(catalogue.checkout_enabled,false);
 assert.equal(catalogue.payment_collection_enabled,false);
 assert.equal(catalogue.products.some(x=>x.available_to_sell),false);
});

test("tampered, repeated and out-of-range Bag entries are ignored",()=>{
 const sku=catalogue.products[0].sku;
 assert.deepEqual(safeBasket([{sku,quantity:1},{sku,quantity:3},{sku:"NOT_REAL",quantity:1},{sku,quantity:999},{sku:catalogue.products[1].sku,quantity:2}],catalogue.products),[{sku,quantity:1},{sku:catalogue.products[1].sku,quantity:2}]);
 assert.deepEqual(safeBasket([{sku,quantity:"2"},{sku,quantity:0},{sku,quantity:1.2}],catalogue.products),[]);
 assert.deepEqual(safeBasket(null,catalogue.products),[]);
 assert.equal(MAX_PER_SKU,99);
});
test("owner-authorized indicative price displays while payment authority remains off",()=>{
 const item=catalogue.products[0];
 assert.equal(publicPrice(item,catalogue),1547);
 assert.equal(publicPrice({...item,retail_price_pence:999},catalogue),999);
 assert.equal(publicPrice(item,{...catalogue,price_authority:"not_yet_verified_for_consumer_sale"}),null);
 assert.equal(publicPrice(item,{...catalogue,checkout_enabled:true}),null);
 assert.equal(publicPrice(item,{...catalogue,price_includes_estimated_uk_vat:false}),null);
 const approved={...catalogue,price_authority:"approved_consumer_retail"};
 assert.equal(publicPrice({...item,retail_price_pence:999},approved),999);
 assert.equal(publicPrice({...item,retail_price_pence:-2},approved),null);
 assert.equal(publicPrice({...item,retail_price_pence:2.5},approved),null);
 assert.equal(basketSubtotal([{sku:item.sku,quantity:1}],catalogue),1547);
 const storefront=readFileSync("assets/js/nutraxin-retail-store.js","utf8");
 assert.match(storefront,/data.price_authority === "approved_consumer_retail"/);
 assert.match(storefront,/data.payment_collection_enabled === true/);
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
 assert.match(html,/data-nx-consumer-terms/);
 const js=readFileSync("assets/js/nutraxin-retail-store.js","utf8");
 assert.match(js,/credentials: "include"/);
 assert.match(js,/v?.checkout_ready === true/);
 assert.match(js,/result.checkoutUrl/);
 assert.match(js,/accept_terms:true/);
 assert.match(html,/No payment will be taken/);
 assert.doesNotMatch(html,/\bsk_live_|\bwhsec_/);
});
