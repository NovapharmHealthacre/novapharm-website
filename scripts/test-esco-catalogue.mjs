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
  assert.match(builder,/data-esco-order-request-form/);
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

test("Bag shows merchant base amounts, retains request flow, and sends no card details from the browser",()=>{
  const generator=readFileSync("scripts/apply-esco-catalogue.mjs","utf8");
  const interaction=readFileSync("assets/js/esco-catalogue.js","utf8");
  const bag=readFileSync("assets/js/esco-bag.js","utf8");
  assert.match(generator,/data-esco-subtotal/);
  assert.match(generator,/data-esco-bag-quote/);
  assert.match(generator,/data-esco-card-checkout disabled/);
  assert.match(generator,/Base price/);
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

test("Live ESCO approved prices take precedence over nonpayable catalogue guides",()=>{
  const frontend=readFileSync("assets/js/esco-bag.js","utf8");
  const api=readFileSync("apps/esco-checkout/index.py","utf8");
  assert.match(api,/approved_unit_prices_pence/);
  assert.match(api,/cfg\["approved_skus"\]\[id\]\["unit_price_pence"\]/);
  assert.match(frontend,/approvedUnitPricesPence/);
  assert.match(frontend,/serverPrices\[id\]/);
  assert.match(frontend,/approvedPrice \?\? Math\.round\(guide\.guidePriceExVatGbp/);
  assert.match(frontend,/UK delivered price/);
  assert.match(frontend,/Ex VAT · final tax shown at Stripe/);
  assert.match(frontend,/paymentServiceReady/);
});

test("ESCO editorial collection keeps 373 models, accessible details and the existing Bag contract",()=>{
 const generator=readFileSync("scripts/apply-esco-catalogue.mjs","utf8");
 const js=readFileSync("assets/js/esco-catalogue.js","utf8");
 const css=readFileSync("assets/css/esco-catalogue.css","utf8");
 assert.match(generator,/esco-storefront" data-esco-catalogue/);
 assert.match(generator,/Better tools\./);
 assert.match(generator,/Better care\./);
 assert.match(generator,/esco-spotlight-grid/);
 assert.match(generator,/ESCO-CAT-0003/);
 assert.match(generator,/ESCO-CAT-0048/);
 assert.match(generator,/esco-category-grid/);
 assert.match(generator,/data-esco-catalogue-id/);
 assert.match(generator,/data-esco-subcategory/);
 assert.match(generator,/data-esco-visible-count>\$\{data\.entriesTotal\} catalogue entries/);
 assert.match(generator,/const cards = category\.entries\.filter/);
 assert.match(generator,/\)\.join\(\x27\x27\);\s*return `<h4 class="esco-subcat"/);
 assert.match(generator,/data-esco-ready-only disabled/);
 assert.match(generator,/data-esco-reset-filters/);
 assert.match(generator,/data-esco-product-dialog/);
 assert.match(generator,/data-esco-dialog-close/);
 assert.match(generator,/data-esco-dialog-add/);
 assert.match(generator,/data-esco-mobile-bag/);
 assert.match(generator,/data-esco-quote-tray/);
 assert.match(generator,/data-esco-add/);
 assert.match(generator,/data-esco-send-quote/);
 assert.match(js,/function syncShopAvailability/);
 assert.match(js,/approved_unit_prices_pence/);
 assert.match(js,/payment_collection_active !== true/);
 assert.match(js,/readyPrices\.has\(item\.dataset\.escoCatalogueId\)/);
 assert.match(js,/readyToggle\?\.addEventListener\("change"/);
 assert.match(js,/function openProductDetails/);
 assert.match(js,/dialog\.showModal/);
 assert.match(js,/state\.set\(id/);
 assert.match(css,/ESCO \/ 2026 retail experience upgrade/);
 assert.match(css,/esco-spotlight-card/);
 assert.match(css,/esco-product-dialog/);
 assert.match(css,/@media\(max-width:520px\)/);
 assert.doesNotMatch(js,/sk_live_[A-Za-z0-9]{16,}|rk_live_[A-Za-z0-9]{16,}|whsec_[A-Za-z0-9]{16,}/);
});


test("ESCO hero and product details stay in separate responsive grid tracks",()=>{
 const css=readFileSync("assets/css/esco-catalogue.css","utf8");
 const generator=readFileSync("scripts/apply-esco-catalogue.mjs","utf8");
 assert.match(css,/ESCO layout hardening: product-led hero/);
 assert.match(css,/\.esco-storefront \.esco-hero-showcase\s*\{\s*display:grid/);
 assert.match(css,/\.esco-storefront \.esco-hero-showcase-image,[\s\S]*?position:relative;/);
 assert.match(css,/\.esco-storefront \.esco-hero-showcase>p\s*\{[\s\S]*?position:static;/);
 assert.match(css,/\.esco-storefront \.esco-dialog-content\s*\{\s*display:grid;/);
 assert.match(css,/\.esco-storefront \.esco-dialog-picture,[\s\S]*?min-width:0;/);
 assert.match(css,/\.esco-storefront \.esco-dialog-picture \.esco-product-art-caption\s*\{\s*position:static;/);
 assert.match(css,/@media\(max-width:800px\)/);
 assert.match(generator,/data-esco-product-dialog/);
});

test("ESCO Bag explains quote-only selections without authorising guide-price charges",()=>{
 const bag=readFileSync("assets/js/esco-bag.js","utf8");
 const shop=readFileSync("assets/js/esco-catalogue.js","utf8");
 assert.match(bag,/lines\.every\(item => approvedCatalogIds\.has\(item\.id\) && approvedUnitPricesPence\.has\(item\.id\) && item\.quantity <= MAX_CARD_QTY\)/);
 assert.match(bag,/quoteOnly = paymentServiceReady/);
 assert.match(bag,/product and delivery confirmation before payment/i);
 assert.match(bag,/\/products\/esco\/\?availability=ready#esco-catalogue/);
 assert.match(shop,/get\("availability"\) === "ready"/);
 assert.match(bag,/checkoutApiOrigin \+ "\/checkout"/);
 assert.doesNotMatch(bag,/sk_live_[A-Za-z0-9]{16,}|rk_live_[A-Za-z0-9]{16,}|whsec_[A-Za-z0-9]{16,}/);
});


test("all 373 ESCO order-request references have a private, non-authorising merchant review row",async()=>{
 const {buildMerchantReviewRows,merchantRowsToCsv}=await import("./esco-merchant-release-matrix.mjs");
 const rows=buildMerchantReviewRows();
 assert.equal(rows.length,373);
 assert.equal(new Set(rows.map(x=>x.catalogue_id)).size,373);
 assert.equal(new Set(rows.map(x=>x.category)).size,12);
 assert.ok(rows.every(x=>x.customer_order_request_available==="YES"));
 assert.ok(rows.every(x=>x.additional_live_card_checkout_approved_by_this_matrix==="NO"));
 assert.ok(rows.every(x=>x.current_live_checkout_status==="VERIFY_AGAINST_PROTECTED_SSM_POLICY"));
 assert.ok(rows.every(x=>x.checkout_status==="AWAITING_INDIVIDUAL_APPROVAL"));
 assert.ok(rows.every(x=>!x.resolved_saleable_variant && !x.approved_stripe_tax_code));
 assert.equal(merchantRowsToCsv(rows).trimEnd().split("\n").length,374);
});

test("ESCO Bag has no greyed checkout dead end and retains server-only payment authority",()=>{
 const bag=readFileSync("assets/js/esco-bag.js","utf8");
 const css=readFileSync("assets/css/esco-catalogue.css","utf8");
 assert.match(bag,/checkoutButton\.hidden = !eligible/);
 assert.match(bag,/orderRequestForm\.hidden = eligible \|\| !lines\.length/);
 assert.match(bag,/Contact product support/);
 assert.match(bag,/approvedUnitPricesPence\.has\(item\.id\)/);
 assert.match(bag,/checkoutApiOrigin \+ "\/checkout"/);
 assert.match(css,/\.esco-shop-bag \.esco-bag-pay\[hidden\]\{display:none!important;\}/);
});
