import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
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
  assert.match(builder,/Request final quote/);
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
  assert.match(builder,/No payment is taken until the exact order is approved/);
});

test("all 373 ESCO products link to an evidence-labelled customer detail and safe Bag route",()=>{
  const builder=readFileSync("scripts/apply-esco-catalogue.mjs","utf8");
  const detail=readFileSync("assets/js/esco-product-detail.js","utf8");
  const css=readFileSync("assets/css/esco-catalogue.css","utf8");
  assert.match(builder,/esco-title-link/);
  assert.match(builder,/esco-image-link/);
  assert.match(builder,/products\/esco\/product\/\?id=/);
  assert.match(builder,/products\/esco\/product\/index\.html/);
  assert.match(builder,/data-esco-detail-page/);
  assert.match(builder,/data-esco-detail-image/);
  assert.match(builder,/data-esco-detail-photo-note/);
  assert.match(builder,/data-esco-detail-quantity/);
  assert.match(builder,/data-esco-detail-add disabled/);
  assert.match(builder,/data-esco-detail-quote/);
  assert.match(detail,/photos\.images\?\.\[id\]/);
  assert.match(detail,/PHOTO_PATH\.test/);
  assert.match(detail,/PREVIEW_PATH\.test/);
  assert.match(detail,/guide\.priceApprovedForCheckout !== false/);
  assert.match(detail,/guides\?\.checkoutEnabled !== false/);
  assert.match(detail,/MAX_LINES = 12/);
  assert.match(detail,/MAX_QTY = 1000/);
  assert.match(detail,/localStorage\.setItem/);
  assert.match(detail,/Original product-type illustration/);
  assert.match(detail,/Model-code-matched supplier catalogue photograph/);
  assert.doesNotMatch(detail,/stripe\.com|checkoutUrl|client_secret|cardNumber/);
  assert.match(css,/\.esco-detail-layout/);
  assert.match(css,/@media\(max-width:780px\)/);
});


test("Bag shows provenance-labelled images for every known ESCO selection",()=>{
  const bag=readFileSync("assets/js/esco-bag.js","utf8");
  const builder=readFileSync("scripts/apply-esco-catalogue.mjs","utf8");
  const photoMap=JSON.parse(readFileSync("assets/data/esco-model-photo-map.json","utf8"));
  const css=readFileSync("assets/css/esco-catalogue.css","utf8");
  assert.equal(photoMap.mappedImagesCount,61);
  assert.match(bag,/esco-model-photo-map\.json/);
  assert.match(bag,/priceData\.visualPreviews/);
  assert.match(bag,/matchedPhoto/);
  assert.match(bag,/esco-bag-thumb/);
  assert.match(bag,/Original concept image/);
  assert.match(bag,/Supplier catalogue image/);
  assert.match(bag,/products\/esco\/product\/\?id=/);
  assert.match(builder,/assets\/js\/esco-product-detail\.js/);
  assert.match(css,/\.esco-bag-thumb/);
  assert.doesNotMatch(bag,/checkout\.sessions|client_secret|cardNumber/);
});


test("every ESCO image carries explicit model-photo or original-artwork provenance",()=>{
  const source=readFileSync("scripts/apply-esco-catalogue.mjs","utf8");
  assert.match(source,/photoEvidence = Object\.fromEntries\(entries\.map/);
  assert.match(source,/esco-image-evidence\.json/);
  assert.match(source,/supplier_catalogue_model_code_match/);
  assert.match(source,/original_product_type_illustration/);
  assert.match(source,/exactVariantPhotosConfirmed:0/);
  assert.match(source,/supplierPhotoWebRightsConfirmed:0/);
});


test("product detail can add a verified reference without deleting other Bag lines",async()=>{
  const script=readFileSync("assets/js/esco-product-detail.js","utf8");
  const photoData=JSON.parse(readFileSync("assets/data/esco-model-photo-map.json","utf8"));
  const guides={
    entriesTotal:373, checkoutEnabled:false, paymentCollectionEnabled:false, requestQuoteOnly:true,
    guidePrices:Object.fromEntries(entries.map(x=>[x.id,{
      guidePriceExVatGbp:19.5, priceApprovedForCheckout:false, checkoutEligible:false
    }])),
    visualPreviews:Object.fromEntries(entries.map(x=>[x.id,
      "/assets/media/esco/previews/"+x.id.toLowerCase()+".svg"]))
  };
  const elements=new Map();
  for(const key of ["add","quantity","status","image","photo-note","title","category","model","price","reference","quote"]){
    const node={value:key==="quantity"?"3":"",textContent:"",dataset:{},
      disabled:key==="add",hidden:key==="image",listeners:{},
      addEventListener(type,callback){this.listeners[type]=callback;}};
    elements.set("[data-esco-detail-"+key+"]",node);
  }
  const store=new Map([["novapharm-esco-quote-list-v1",JSON.stringify([
    {id:"ESCO-CAT-0002",quantity:4}
  ])]]);
  const accessed=[];
  const ctx={
    document:{title:"ESCO",querySelector:s=>s==="[data-esco-detail-page]"?{
      querySelector:selector=>elements.get(selector)||null
    }:null},
    location:{search:"?id=ESCO-CAT-0001"},
    localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},
    URLSearchParams, Intl,
    fetch:async url=>{
      accessed.push(url);
      const value=url.includes("esco-model-photo-map")?photoData:
        url.includes("esco-uk-guide-prices")?guides:data;
      return {ok:true,json:async()=>value};
    }
  };
  runInNewContext(script,ctx,{timeout:2000});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(elements.get("[data-esco-detail-add]").disabled,false);
  assert.match(elements.get("[data-esco-detail-image]").src,/^\/assets\/media\/esco\//);
  assert.equal(accessed.length,3);
  elements.get("[data-esco-detail-add]").listeners.click();
  const saved=JSON.parse(store.get("novapharm-esco-quote-list-v1"));
  assert.equal(saved.length,2);
  assert.equal(saved.find(x=>x.id==="ESCO-CAT-0001").quantity,3);
  assert.equal(saved.find(x=>x.id==="ESCO-CAT-0002").quantity,4);
  elements.get("[data-esco-detail-quantity]").value="1001";
  elements.get("[data-esco-detail-add]").listeners.click();
  assert.equal(JSON.parse(store.get("novapharm-esco-quote-list-v1")).length,2);
  assert.match(elements.get("[data-esco-detail-status]").textContent,/whole-number quantity/);
});


test("illustrative image families distinguish distinct hospital and surgical items",async()=>{
  const {makeProductIllustration}=await import("./esco-merchandising.mjs");
  const examples=[
    ["ESCO-CAT-0279","scissors"],
    ["ESCO-CAT-0280","forceps"],
    ["ESCO-CAT-0340","scalpel"],
    ["ESCO-CAT-0283","retractor"],
    ["ESCO-CAT-0286","speculum"],
    ["ESCO-CAT-0243","petri"],
    ["ESCO-CAT-0026","mattress"],
    ["ESCO-CAT-0145","mask"],
    ["ESCO-CAT-0065","stand"]
  ];
  const byId=new Map(data.categories.flatMap(category=>category.entries.map(item=>[
    item.id,{...item,category:category.name}
  ])));
  for(const [id,kind] of examples){
    const item=byId.get(id);
    assert.ok(item,"Missing ESCO catalogue item "+id);
    assert.match(makeProductIllustration(item),new RegExp('data-concept-type="'+kind+'"'),id);
  }
});


test("none of the 373 catalogue concepts falls back to an unrelated generic machine",async()=>{
  const {makeProductIllustration}=await import("./esco-merchandising.mjs");
  let checked=0;
  for(const category of data.categories)for(const product of category.entries){
    const svg=makeProductIllustration({...product,category:category.name});
    assert.match(svg,/data-concept-type="/);
    assert.doesNotMatch(svg,/data-concept-type="machine"/,product.id+" should have an appropriate product family");
    checked++;
  }
  assert.equal(checked,373);
});
