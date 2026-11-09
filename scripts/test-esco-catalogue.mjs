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
  assert.match(builder,/Request a confirmed quote/);
  assert.match(builder,/products\/esco\/bag\/index.html/);
  assert.match(builder,/data-esco-bag-items/);
  assert.match(interaction,/const MAX_ITEMS = 12/);
  assert.match(interaction,/quote=/);
  assert.match(contact,/quoteMessage.*startsWith/);
  assert.match(productionContact,/rawEscoQuote/);
  assert.match(productionContact,/items.length <= 12/);
  assert.match(fallback,/quoteMessage.*startsWith/);
  assert.doesNotMatch(builder,/payment_collection_enabled|buy now|checkoutEnabled: true/);
});

test("all 373 ESCO entries have product-specific, accurately labelled concept previews",async()=>{
  const {makeProductIllustration,guideFor}=await import("./esco-merchandising.mjs");
  const builder=readFileSync("scripts/apply-esco-catalogue.mjs","utf8");
  const css=readFileSync("assets/css/esco-catalogue.css","utf8");
  const ids=new Set();
  for(const category of data.categories)for(const p of category.entries){
    const item={...p,category:category.name};
    const graphic=makeProductIllustration(item);
    const guide=guideFor(item);
    assert.ok(graphic.includes("Concept illustration for "));
    assert.ok(graphic.includes(p.name.replace(/[—–]/g,"-").slice(0,8)) || graphic.includes(p.name.split(" ")[0]));
    assert.match(graphic,/<svg xmlns=/);
    assert.ok(guide.guidePriceExVatGbp>0);
    assert.equal(guide.checkoutEligible,false);
    assert.equal(guide.priceApprovedForCheckout,false);
    assert.equal(guide.grossMarginGuaranteed,false);
    assert.equal(guide.supplierUnitCostKnown,false);
    ids.add(p.id);
  }
  assert.equal(ids.size,373);
  assert.match(builder,/buildMerchandising\(entries\)/);
  assert.match(builder,/esco-product-concept/);
  assert.match(builder,/merchandising\.guidePrices\[p\.id\]/);
  assert.match(builder,/Original product concept/);
  assert.match(css,/\.esco-product-concept/);
  assert.match(css,/:is\(\.esco-category-image,\.esco-product-art\)\[data-esco-photo/);
  assert.equal((css.match(/:is\(\.esco-category-image,\.esco-product-art\)\[data-esco-photo=/g)||[]).length,12);
});

test("consumer Bag shows estimates, retains quote flow and never solicits or processes card payments",()=>{
  const generator=readFileSync("scripts/apply-esco-catalogue.mjs","utf8");
  const interaction=readFileSync("assets/js/esco-catalogue.js","utf8");
  const bag=readFileSync("assets/js/esco-bag.js","utf8");
  assert.match(generator,/data-esco-subtotal/);
  assert.match(generator,/data-esco-bag-quote/);
  assert.match(generator,/data-esco-card-checkout disabled/);
  assert.match(generator,/UK guide/);
  assert.match(interaction,/guidePence/);
  assert.match(bag,/MAX_ITEMS = 12/);
  assert.match(bag,/requestQuoteOnly !== true/);
  assert.doesNotMatch(bag,/Stripe\(|checkout\.sessions\.create|client_secret|cardNumber/);
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
  assert.match(generator,/Source catalogue photo/);
  assert.match(generator,/Source catalogue photo/);
  assert.match(generator,/Original product concept/);
});

test("owner-declared 10000 per catalogue reference is planning stock, not verified fulfillment or a buy button",async()=>{
  const {guideFor}=await import("./esco-merchandising.mjs");
  const all=data.categories.flatMap(category=>category.entries.map(item=>({...item, category:category.name})));
  assert.equal(all.length,373);
  const declaredUnits=all.reduce((sum,item)=>{
    const price=guideFor(item);
    assert.equal(price.ownerDeclaredStockUnits,10000);
    assert.equal(price.stockVerified,false);
    assert.equal(price.availableToPromiseUnits,null);
    assert.equal(price.inventoryEvidence,'OWNER_DECLARATION_NOT_WAREHOUSE_RECONCILED');
    assert.equal(price.checkoutEligible,false);
    assert.equal(price.priceApprovedForCheckout,false);
    assert.equal(price.unitEconomics.grossMarginTarget,0.25);
    assert.equal(price.unitEconomics.assumptionsOnly,true);
    assert.equal(price.unitEconomics.grossProfitProven,false);
    assert.equal(price.unitEconomics.actualSupplierCostKnown,false);
    assert.equal(price.unitEconomics.actualFreightKnown,false);
    assert.equal(price.unitEconomics.actualPaymentFeesKnown,false);
    assert.equal(price.unitEconomics.actualStorageChargesKnown,false);
    assert.ok(price.unitEconomics.maximumSupplierAndInboundCostGbp>=0);
    const cap=Math.round(price.guidePriceExVatGbp*0.75*100)/100;
    assert.ok(Math.abs(price.unitEconomics.maximumTotalVariableCostGbp-cap)<=0.01);
    const modeled=price.unitEconomics;
    const remaining=Math.round((modeled.maximumTotalVariableCostGbp-
      modeled.illustrativeOutboundDeliveryAllocationGbp-
      modeled.illustrativeCardFeeAllocationGbp-
      modeled.illustrativeThreeMonthStorageReserveGbp)*100)/100;
    assert.equal(modeled.maximumSupplierAndInboundCostGbp,Math.max(0,remaining));
    return sum + price.ownerDeclaredStockUnits;
  },0);
  assert.equal(declaredUnits,3730000);
  const builder=readFileSync("scripts/apply-esco-catalogue.mjs","utf8");
  assert.match(builder,/10,000 units per catalogue reference/);
  assert.match(builder,/warehouse-verified available stock/);
  assert.match(builder,/Card checkout is available for individually approved UK-saleable products only/);
});

test("ESCO payment button only enables from protected server readiness, never from guide prices or owner stock",()=>{
  const builder=readFileSync("scripts/apply-esco-catalogue.mjs","utf8");
  const bag=readFileSync("assets/js/esco-bag.js","utf8");
  const config=JSON.parse(readFileSync("assets/data/esco-checkout-config.json","utf8"));
  assert.equal(config.enabled,true);
  assert.equal(config.public_guide_prices_authorize_payment,false);
  assert.equal(config.payment_eligibility_from_server_only,true);
  assert.match(config.api_origin,/^https:\/\/[a-z0-9]+\.execute-api\.eu-north-1\.amazonaws\.com$/);
  assert.match(builder,/data-esco-card-checkout disabled/);
  assert.match(builder,/data-esco-payment-terms/);
  assert.match(builder,/data-esco-checkout-status/);
  assert.match(bag,/paymentServiceReady/);
  assert.match(bag,/approvedCatalogIds/);
  assert.match(bag,/checkout_ready !== true/);
  assert.match(bag,/payment_collection_active !== true/);
  assert.match(bag,/termsCheckbox\.checked/);
  assert.match(bag,/checkoutApiOrigin \+ "\/checkout"/);
  assert.match(bag,/redirect\.hostname !== "checkout\.stripe\.com"/);
  assert.match(bag,/info\.paid === true && info\.status === "PAID"/);
  assert.doesNotMatch(bag,/sk_live_[A-Za-z0-9]{16,}|rk_live_[A-Za-z0-9]{16,}|whsec_[A-Za-z0-9]{16,}/);
});

test("ESCO v2 is a visual shopping Bag, not an inline quotation table",()=>{
  const generator=readFileSync("scripts/apply-esco-catalogue.mjs","utf8");
  const bag=readFileSync("assets/js/esco-bag.js","utf8");
  const css=readFileSync("assets/css/esco-catalogue.css","utf8");
  assert.match(generator,/esco-shop-mini-bag/);
  assert.match(generator,/esco-mini-a11y-list/);
  assert.match(generator,/Review your Bag/);
  assert.match(generator,/esco-shop-bag/);
  assert.match(generator,/esco-bag-totals/);
  assert.match(generator,/Order summary/);
  assert.match(generator,/data-esco-bag-count/);
  assert.match(generator,/Continue to secure checkout/);
  assert.match(bag,/esco-shopping-picture/);
  assert.match(bag,/esco-shopping-line-total/);
  assert.match(bag,/data-esco-bag-qty/);
  assert.match(bag,/productImage/);
  assert.match(bag,/esco-model-photo-map\.json/);
  assert.match(bag,/priceData\?\.visualPreviews/);
  assert.match(bag,/paymentServiceReady/);
  assert.match(bag,/checkoutApiOrigin/);
  assert.match(css,/esco-shop-mini-bag/);
  assert.match(css,/esco-shop-bag/);
  assert.match(css,/\.esco-shopping-item/);
  assert.match(css,/@media\(max-width:600px\)/);
});
