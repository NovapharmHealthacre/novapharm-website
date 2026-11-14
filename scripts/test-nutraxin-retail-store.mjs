import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { safeBasket, catalogueIsSafe, publicPrice, basketSubtotal, checkoutReturnOutcome, MAX_PER_SKU } from "../assets/js/nutraxin-retail-store.js";

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
  assert.equal(publicEntry.available_to_sell,true);
  assert.equal(publicEntry.ordering_enabled,true);
  assert.equal(Math.round(publicEntry.retail_net_pence*1.2),publicEntry.retail_price_pence);
 }
 assert.equal(catalogue.checkout_enabled,true);
 assert.equal(catalogue.payment_collection_enabled,true);
 assert.equal(catalogue.price_authority,"approved_consumer_retail");
 assert.equal(catalogue.price_includes_estimated_uk_vat,true);
 assert.equal(catalogue.vat_estimate_rate_percent,20);
 assert.equal(catalogue.delivery_verified,true);
 assert.equal(catalogue.provisional_uk_delivery_charge_pence,0);
 assert.equal(catalogue.provisional_uk_delivery_cost_seller_funded,true);
 assert.match(catalogue.source_record,/_v6$/);
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
 assert.equal(catalogue.price_display_status,"owner_approved_uk_consumer_prices");
 assert.equal(catalogue.checkout_enabled,true);
 assert.equal(catalogue.payment_collection_enabled,true);
 assert.equal(catalogue.products.every(x=>x.available_to_sell),true);
});

test("tampered, repeated and out-of-range Bag entries are ignored",()=>{
 const sku=catalogue.products[0].sku;
 assert.deepEqual(safeBasket([{sku,quantity:1},{sku,quantity:3},{sku:"NOT_REAL",quantity:1},{sku,quantity:10001},{sku:catalogue.products[1].sku,quantity:2}],catalogue.products),[{sku,quantity:1},{sku:catalogue.products[1].sku,quantity:2}]);
 assert.deepEqual(safeBasket([{sku,quantity:"2"},{sku,quantity:0},{sku,quantity:1.2}],catalogue.products),[]);
 assert.deepEqual(safeBasket(null,catalogue.products),[]);
 assert.equal(MAX_PER_SKU,10000);
});
test("owner-authorized chargeable price displays only under approved retail policy",()=>{
 const item=catalogue.products[0];
 assert.equal(publicPrice(item,catalogue),1547);
 assert.equal(publicPrice({...item,retail_price_pence:999},catalogue),999);
 assert.equal(publicPrice(item,{...catalogue,price_authority:"not_yet_verified_for_consumer_sale"}),null);
 assert.equal(publicPrice(item,{...catalogue,payment_collection_enabled:false}),null);
 assert.equal(publicPrice(item,{...catalogue,price_authority:"owner_authorized_provisional_public_display",checkout_enabled:true}),null);
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
 const products=catalogue.products.map((p,i)=>({...p,retail_price_pence:i===0?1234:i===1?2299:null,retail_net_pence:i===0?1028:i===1?1916:null}));
 const approved={...catalogue,price_authority:"approved_consumer_retail",products};
 assert.equal(basketSubtotal([{sku:products[0].sku,quantity:2},{sku:products[1].sku,quantity:1}],approved),4767);
 assert.equal(basketSubtotal([{sku:products[2].sku,quantity:1}],approved),null);
 assert.equal(basketSubtotal([{sku:"NOT_REAL",quantity:1}],approved),null);
});
test("the review page uses the Products-only API and never the customer portal",()=>{
 const html=readFileSync("products/nutraxin/bag/index.html","utf8");
 assert.match(html,/data-nx-public-bag/);
 assert.match(html,/data-nx-checkout disabled/);
 assert.match(html,/data-nx-consumer-terms/);
 assert.match(html,/href="\/legal\/terms\/#nutraxin-consumer-sales"/);
 const legal=readFileSync("legal/terms/index.html","utf8");
 assert.match(legal,/id="nutraxin-consumer-sales"/);
 assert.match(legal,/14 days of receiving goods/);
 assert.doesNotMatch(legal,/The website is for corporate and qualified B2B information\./);
 assert.match(html,/class="nx-purchase-progress"/);
 assert.match(html,/aria-current="step"/);
 assert.match(html,/Your Bag/);
 assert.match(html,/Guest checkout available/);
 assert.match(html,/Sign in or create your Nutraxin account/);
 assert.match(html,/Account access activates only after verified email/);
 const styles=readFileSync("assets/css/nutraxin-retail-store.css","utf8");
 assert.match(styles,/nx-checkout-identity/);
 const js=readFileSync("assets/js/nutraxin-retail-store.js","utf8");
 assert.match(js,/Continue as guest/);
 assert.match(js,/credentials: "omit"/);
 assert.equal(js.includes("PORTAL_ORIGIN"), false, "Nutraxin checkout must not use a portal destination constant");
 assert.ok(js.includes('const target=accountToken?"/account/checkout":"/checkout"'), "Checkout uses the Products-only API for both verified customer and guest");
 assert.match(js,/credentials: "omit"/);
 const stripeReturnHandler=js.split('const returnedOrder = query.get("order_id");')[1]?.split('// Products-site readiness')[0];
 assert.ok(stripeReturnHandler,"Checkout return handler exists");
 assert.equal(stripeReturnHandler.includes("explanation.textContent"),false,"Stripe return must update UI through render, not stale scoped variables");
 assert.equal(stripeReturnHandler.includes("checkout.disabled"),false,"Stripe return cannot access a checkout button outside its scope");
 assert.ok(stripeReturnHandler.includes("confirmedOrder = returnedOrder"),"Paid webhook state persists during render");
 assert.ok(stripeReturnHandler.includes("awaitingOrder = returnedOrder"),"Pending payment is not exposed as a fresh checkout");
 assert.match(js,/\/checkout/);
 assert.match(js,/v?.checkout_ready === true/);
 assert.match(js,/result.checkoutUrl/);
 assert.match(js,/accept_terms:true/);
 assert.match(html,/data-nx-public-bag/);
 assert.doesNotMatch(html,/\bsk_live_|\bwhsec_/);
});

test("production Stripe IAM allows underlying transactional PutItem and UpdateItem on exact tables",()=>{
 const checkout=JSON.parse(readFileSync("infra/aws/nutraxin-approved-checkout-production.json","utf8"));
 const webhook=JSON.parse(readFileSync("infra/aws/nutraxin-stripe-webhook-production.json","utf8"));
 const checkoutPolicy=checkout.Resources.CheckoutRole.Properties.Policies[0].PolicyDocument.Statement;
 const ledgerGrant=checkoutPolicy.find(s=>Array.isArray(s.Action)&&s.Action.includes("dynamodb:PutItem"));
 assert.deepEqual(ledgerGrant.Action,["dynamodb:GetItem","dynamodb:PutItem","dynamodb:UpdateItem"]);
 assert.match(JSON.stringify(ledgerGrant.Resource),/novapharm-production-nutraxin-payment-ledger/);
 const webhookPolicy=webhook.Resources.WebhookRole.Properties.Policies[0].PolicyDocument.Statement;
 const ledgerWebhookGrant=webhookPolicy.find(s=>Array.isArray(s.Action)&&s.Action.includes("dynamodb:UpdateItem"));
 const outboxWebhookGrant=webhookPolicy.find(s=>Array.isArray(s.Action)&&s.Action.length===1&&s.Action[0]==="dynamodb:PutItem");
 assert.deepEqual(ledgerWebhookGrant.Action,["dynamodb:GetItem","dynamodb:PutItem","dynamodb:UpdateItem"]);
 assert.match(JSON.stringify(ledgerWebhookGrant.Resource),/novapharm-production-nutraxin-payment-ledger/);
 assert.match(JSON.stringify(outboxWebhookGrant.Resource),/novapharm-production-nutraxin-payment-outbox/);
 assert.equal(JSON.stringify(checkoutPolicy).includes("dynamodb:TransactWriteItems"),false);
 assert.equal(JSON.stringify(webhookPolicy).includes("dynamodb:TransactWriteItems"),false);
});

test("Pages build generator preserves the canonical Nutraxin Bag journey",()=>{
 const source=readFileSync("scripts/apply-corporate-product-discipline.mjs","utf8");
 const page=readFileSync("products/nutraxin/bag/index.html","utf8");
 const expected=page.match(/<main id="main" class="npd-main nx-shop-bag" data-nx-public-bag>[\s\S]*?<\/main>/)?.[0];
 const generator=source.split("function nutraxinBagMain() {")[1]?.split("function nutraxinOrderRequestMain()")[0];
 const generated=generator?.split("  return `")[1]?.split("`;")[0];
 assert.ok(expected,"Canonical Bag main exists");
 assert.equal(generated,expected,"Site generator must preserve the approved Bag HTML exactly");
 assert.match(generated,/Simple from start to finish\./);
 assert.match(generated,/Guest checkout available/);
 assert.match(generated,/nx-purchase-progress/);
});

test("Stripe return does not confuse expiry with payment failure or erase Bag",()=>{
 assert.equal(checkoutReturnOutcome({status:"PAID",paid:true}),"paid");
 assert.equal(checkoutReturnOutcome({status:"CHECKOUT_EXPIRED",paid:false}),"expired");
 assert.equal(checkoutReturnOutcome({status:"PAYMENT_FAILED",paid:false}),"failed");
 assert.equal(checkoutReturnOutcome({status:"CHECKOUT_OPEN",paid:false}),"pending");
 assert.equal(checkoutReturnOutcome({status:"PAID",paid:false}),"pending");
 assert.equal(checkoutReturnOutcome({status:"CHECKOUT_EXPIRED",paid:true}),"pending");
 assert.equal(checkoutReturnOutcome(null),"pending");
 const js=readFileSync("assets/js/nutraxin-retail-store.js","utf8");
 const returned=js.split('const returnedOrder = query.get("order_id");')[1]?.split("// Products-site readiness")[0];
 assert.match(returned,/checkoutReturnOutcome\(result\)/);
 assert.match(returned,/outcome === "expired" \|\| outcome === "failed"/);
 assert.match(returned,/closedOrder = returnedOrder/);
 assert.match(returned,/if \(outcome === "paid"\)/);
 assert.match(returned,/bag=\[\];saveBag\(bag\)/);
 assert.equal(returned.split("bag=[];saveBag(bag)").length-1,1,"Only verified paid status may empty the bag");
 assert.match(js,/Your Bag is saved and you may start a new checkout/);
 assert.match(js,/No successful payment has been recorded/);
});
